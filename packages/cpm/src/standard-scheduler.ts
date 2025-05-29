/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { isAfter, isBefore, isEqual } from 'date-fns'
import { Duration } from './duration'
import { type ProjectFile } from './project'
import type { ProjectCalendar } from './project-calendar'
import { Relation, RelationType } from './relation'
import { ResourceType } from './resource'
import { type ResourceAssignment } from './resource-assignment'
import { type Scheduler } from './scheduler'
import { ConstraintType, Task, TaskMode, TaskType } from './task'
import { isElapsedTimeUnit, TimeUnit } from './time-unit'
import { isNonNullable } from './lib/truthiness'
import { DateUtils } from './lib/date-utils'

export class StandardScheduler implements Scheduler {
  private declare file: ProjectFile
  private declare projectStartDate: Date
  private declare projectFinishDate: Date

  private declare sortedTasks: Task[]
  private isBackwardPass = false

  private summaryTaskPredecessors = new Map<Task, Relation[]>()
  private summaryTaskSuccessors = new Map<Task, Relation[]>()
  private calculatedLateStart = new Map<Task, Date>()

  schedule(file: ProjectFile, startDate: Date): void {
    this.file = file
    this.projectStartDate = startDate

    // 使用深度优先图排序获取任务执行顺序
    const tasks = file.getSortedTasks()
    this.sortedTasks = tasks
    if (tasks.length === 0) {
      return
    }

    this.validateTasks(tasks)
    this.clearDates()
    this.isBackwardPass = false
    this.forwardPass(tasks)

    const summaryTasksHaveLogic = this.file.getTasks().some((t) => {
      return t.isSummary && (t.predecessors.length > 0 || t.successors.length > 0)
    })
    if (summaryTasksHaveLogic) {
      this.createSummaryTaskRelationships()

      const tasks = this.file.getSortedTasks((task) => {
        const successors = task.successors
        const summaryTaskSuccessors = this.summaryTaskSuccessors.get(task)
        if (summaryTaskSuccessors) {
          return [...successors, ...summaryTaskSuccessors]
        }
        return successors
      })

      this.sortedTasks = tasks

      this.forwardPass(tasks)
    }

    const projectFinishDate = max(
      tasks.map(it => {
        return it.earlyFinish
      }).filter(isNonNullable)
    )
    if (!projectFinishDate) {
      throw new Error('Missing project finish date')
    }
    this.projectFinishDate = projectFinishDate
    // this.projectFinishDate = tasks.stream().map(Task::getEarlyFinish).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElseThrow(() -> new CpmException("Missing early finish date"));

    this.backwardPass(tasks)
    this.isBackwardPass = true;

    if (tasks.some(t => t.constraintType === ConstraintType.AS_LATE_AS_POSSIBLE)) {
      this.forwardPass(tasks);
    }

    for (const task of tasks) {
      if (task.isExternalTask || task.isExternalProject || !task.isActive || task.mode === TaskMode.MANUALLY_SCHEDULED) {
        continue;
      }

      task.start = task.actualStart == null ? (task.constraintType === ConstraintType.AS_LATE_AS_POSSIBLE ? task.lateStart : task.earlyStart) : task.actualStart;
      task.finish = task.actualFinish == null ? (task.constraintType === ConstraintType.AS_LATE_AS_POSSIBLE ? task.lateFinish : task.earlyFinish) : task.actualFinish;

      if (!this.useTaskEffectiveCalendar(task)) {
        // TODO: should be using union of resource calendars?
        task.duration = task.getEffectiveCalendar().getWork(task.start!, task.finish!, TimeUnit.DAYS);
      }
    }

    this.file.getTopLevelTasks().forEach(it => {
      this.rollupDates(it);
    });
  }

  private validateTasks(_tasks: Task[]) {
    // todo(hc): 验证所有任务是否具有必要的数据
  }

  private clearDates() {
    for (const task of this.file.tasks) {
      if (task.isExternalTask
        || task.isExternalProject
        || !task.isActive
        || task.mode === TaskMode.MANUALLY_SCHEDULED) {
        continue
      }
      task.start = null
      task.finish = null
      task.earlyStart = null
      task.earlyFinish = null
      task.lateStart = null
      task.lateFinish = null
      task.isCritical = null
    }
  }

  private forwardPass(tasks: Task[]) {
    for (const task of tasks) {
      this.forwardPassTask(task)
    }
  }

  private forwardPassTask(task: Task) {
    // 手动调度的任务直接使用现有日期
    if (task.mode === TaskMode.MANUALLY_SCHEDULED) {
      task.earlyStart = task.start
      task.earlyFinish = task.finish
      return
    }

    // 外部任务：仅作为前置任务计算，不修改任务本身
    if (task.isExternalTask || task.isExternalProject) {
      return
    }

    let earlyStart: Date | null = null
    let earlyFinish: Date | null = null

    let predecessors = task.predecessors.filter((it) => {
      return this.isTask(it.predecessorTask)
    })

    const summaryTaskPredecessors = this.summaryTaskPredecessors.get(task)

    // 获取所有前置任务关系
    if (summaryTaskPredecessors) {
      predecessors = predecessors.concat(summaryTaskPredecessors)
    }

    if (task.actualStart === null) {
      if (predecessors.length === 0) {
        switch (task.constraintType) {
          case ConstraintType.START_NO_EARLIER_THAN:
          {
            earlyStart = task.constraintDate!
            break
          }

          case ConstraintType.FINISH_NO_EARLIER_THAN:
          {
            earlyFinish = task.constraintDate!
            earlyStart = this.getDateFromFinishAndDuration(task, earlyFinish)
            break
          }

          default:
          {
            earlyStart = this.addLevelingDelay(task, this.getNextWorkStart(task, this.projectStartDate)!)
            break
          }
        }
      } else {
        earlyStart = max(
          predecessors.map((it) => {
            return this.calculateEarlyStart(it)
          }),
        )
        if (!earlyStart) {
          throw new Error('Missing early start date' + task.guid)
        }
        // <original-java-code>
        // earlyStart = predecessors.stream().map(this::calculateEarlyStart).max(Comparator.naturalOrder()).orElseThrow(() -> new CpmException("Missing early start date"));
        // </original-java-code>
      }
      earlyStart = this.getNextWorkStart(task, earlyStart!)
      if (!earlyStart) {
        throw new Error('Missing early start date' + task.guid)
      }

      // 任务具有约束
      if (task.constraintType !== null) {
        switch (task.constraintType) {
          case ConstraintType.START_NO_EARLIER_THAN:
          {
            if (isBefore(earlyStart, task.constraintDate!)) {
              earlyStart = task.constraintDate!
            }
            break
          }

          case ConstraintType.FINISH_NO_LATER_THAN:
          {
            const latestStart = this.getDateFromFinishAndDuration(task, task.constraintDate!)
            if (!latestStart) {
              throw new Error('Missing latest start date for task ' + task.guid)
            }
            if (isAfter(earlyStart, latestStart)) {
              earlyStart = latestStart
            }
            break
          }

          case ConstraintType.FINISH_NO_EARLIER_THAN:
          {
            const earliestStart = this.getDateFromFinishAndDuration(task, task.constraintDate!)
            if (!earliestStart) {
              throw new Error('Missing earliest start date for task ' + task.guid)
            }
            if (isBefore(earlyStart, earliestStart)) {
              earlyStart = earliestStart
            }
            // <original-java-code>
            // if (earlyStart.isBefore(earliestStart)) {
            //   earlyStart = earliestStart
            // }
            // </original-java-code>
            break
          }

          case ConstraintType.START_NO_LATER_THAN:
          {
            if (isAfter(earlyStart, task.constraintDate!)) {
              earlyStart = task.constraintDate!
            }
            break
            // <original-java-code>
            // if (earlyStart.isAfter(task.getConstraintDate())) {
            //   earlyStart = task.getConstraintDate()
            // }
            // break
            // </original-java-code>
          }

          case ConstraintType.MUST_START_ON:
          case ConstraintType.START_ON:
          {
            earlyStart = task.constraintDate
            break
          }

          case ConstraintType.MUST_FINISH_ON:
          case ConstraintType.FINISH_ON:
          {
            earlyFinish = task.constraintDate
            earlyStart = this.getDateFromFinishAndDuration(task, earlyFinish!)
            break
          }

          default:
          {
            break
          }
        }
      }
    } else {
      earlyStart = task.actualStart
      if (task.constraintType && !task.actualFinish) {
        earlyFinish = this.getDateFromStartAndDuration(task, earlyStart)!

        switch (task.constraintType) {
          case ConstraintType.FINISH_NO_EARLIER_THAN:
          {
            if (isBefore(earlyFinish, task.constraintDate!)) {
              earlyFinish = task.constraintDate!
            }
            break
          }

          default:
          {
            // TODO: construct samples for other constraints and test
            break
          }
        }
      }
    }

    if (!earlyFinish) {
      earlyFinish = !task.actualFinish ? this.getDateFromStartAndDuration(task, earlyStart!) : task.actualFinish
    }

    task.earlyStart = earlyStart
    task.earlyFinish = earlyFinish
  }

    /**
   * Perform the CPM backward pass.
   *
   * @param forwardPassTasks tasks in order for forward pass
   */
  private backwardPass(forwardPassTasks: Task[]) {
    const tasks = forwardPassTasks.slice().reverse()

    for (const task of tasks) {
      this.backwardPassTask(task)
    }
  }

  /**
   * Perform the CPM backward pass for this task.
   *
   * @param task task to schedule
   */
  private backwardPassTask(task: Task) {
    // We'll use external tasks as successors when scheduling, but we'll leave their late dates unchanged.
    if (task.isExternalTask || task.isExternalProject) {
      return
    }
    
    const successors = this.file.relationContainer.getSuccessors(task).filter(r => {
      return this.isTask(r.successorTask) && r.successorTask.actualFinish == null
    })
    const summaryTaskSuccessors = this.summaryTaskSuccessors.get(task);
    if (summaryTaskSuccessors != null) {
      successors.push(...summaryTaskSuccessors);
    }

    let lateFinish: Date | null = null

    if (task.actualFinish == null) {
      if (successors.length === 0) {
        lateFinish = this.projectFinishDate;
      }
      else {
        if (task.isMilestone && task.duration.duration == 0 && task.actualStart != null) {
          lateFinish = task.actualStart;
        }
        else {
          const calculatedLateFinish = min(
            successors.map(it => {
              return this.calculateLateFinish(it)
            })
          )
          if (!calculatedLateFinish) {
            throw new Error('Missing late start date for task ' + task.guid)
          }
          lateFinish = calculatedLateFinish
          // <original-java-code>
          // lateFinish = successors.stream().map(this::calculateLateFinish).min(Comparator.naturalOrder()).orElseThrow(() -> new CpmException("Missing late start date"));
          // </original-java-code>
        }
      }

      switch (task.constraintType) {
        case ConstraintType.MUST_START_ON: {
          lateFinish = this.getDateFromStartAndDuration(task, task.constraintDate!);
          break;
        }

        case ConstraintType.FINISH_ON:
        case ConstraintType.MUST_FINISH_ON: {
          lateFinish = task.constraintDate;
          break;
        }

        case ConstraintType.START_NO_LATER_THAN: {
          const latestFinish = this.getDateFromStartAndDuration(task, task.constraintDate!)
          if (!latestFinish) {
            throw new Error('Missing latest finish date for task ' + task.guid)
          }
          if (isAfter(lateFinish, latestFinish)) {
            lateFinish = latestFinish
          }
          // <original-java-code>
          // if (lateFinish.isAfter(latestFinish)) {
          //   lateFinish = latestFinish;
          // }
          // </original-java-code>
          break;
        }

        case ConstraintType.FINISH_NO_LATER_THAN: {
          if (isAfter(lateFinish, task.constraintDate!)) {
            lateFinish = task.constraintDate!
          }
          // <original-java-code>
          // if (lateFinish.isAfter(task.getConstraintDate())) {
          //   lateFinish = task.getConstraintDate();
          // }
          // </original-java-code>
          break;
        }
      }

      if (task.deadline != null && isAfter(lateFinish!, task.deadline)) {
        lateFinish = task.deadline;
      }
      // <original-java-code>
      // if (task.getDeadline() != null && lateFinish.isAfter(task.getDeadline())) {
      //   lateFinish = task.getDeadline();
      // }
      // </original-java-code>

      // If we are at the start of the next period of work, we can move back to the end of the previous period of work
      lateFinish = this.getEquivalentPreviousWorkFinish(task, lateFinish!);
    }
    else {
      lateFinish = task.actualFinish
    }

    if (task.mode == TaskMode.MANUALLY_SCHEDULED) {
      const lateStart = this.getDateFromFinishAndDuration(task, lateFinish!);
      this.calculatedLateStart.set(task, lateStart!);

      if (task.actualFinish == null) {
        task.lateStart = lateStart;
        task.lateFinish = lateFinish;
      }
      else {
        task.lateStart = task.actualStart;
        task.lateFinish = lateFinish;
      }
    }
    else {
      const lateStart = this.getDateFromFinishAndRemainingDuration(task, lateFinish!);
      this.calculatedLateStart.set(task, lateStart!);

      task.lateStart = task.actualStart == null ? lateStart : task.actualStart;
      task.lateFinish = lateFinish;
    }
  }
  /**
    * Calculate the early start for the successor task in this relationship.
    *
    * @param relation relationship between two tasks
    * @return calculated early start date
    */
  private calculateEarlyStart(relation: Relation): Date {
    switch (relation.type) {
      case RelationType.FINISH_START:
      {
        return this.calculateEarlyStartForFinishStart(relation)
      }

      case RelationType.START_START:
      {
        return this.calculateEarlyStartForStartStart(relation)
      }

      case RelationType.FINISH_FINISH:
      {
        return this.calculateEarlyStartForFinishFinish(relation)
      }

      case RelationType.START_FINISH:
      {
        return this.calculateEarlyStartForStartFinish(relation)
      }
    }
  }

  /**
   * Calculate the early start for the successor task in a finish-start relationship.
   *
   * @param relation relationship between two tasks
   * @return calculated early start date
   */
  private calculateEarlyStartForFinishStart(relation: Relation) {
    const predecessorTask = relation.predecessorTask

    if (predecessorTask.actualStart === null) {
      // Predecessor not started
      // Successor not started
      const finish = this.isAlap(relation) ? predecessorTask.lateFinish : predecessorTask.earlyFinish
      return this.addLag(relation, finish!)
    }

    // Predecessor started
    if (predecessorTask.actualFinish !== null) {
      // Predecessor finished
      // Successor not started
      const finish = this.isAlap(relation) ? predecessorTask.lateFinish : predecessorTask.earlyFinish
      return this.addLag(relation, finish!)
    }

    // Predecessor not finished
    // Successor not started
    const finish = this.isAlap(relation) ? predecessorTask.lateFinish : predecessorTask.earlyFinish
    return this.addLag(relation, finish!)
  }

  /**
   * Calculate the early start for the successor task in a start-start relationship.
   *
   * @param relation relationship between two tasks
   * @return calculated early start date
   */
  private calculateEarlyStartForStartStart(relation: Relation) {
    const predecessorTask = relation.predecessorTask

    if (predecessorTask.actualStart === null) {
      // Predecessor not started
      // Successor not started
      const start = this.isAlap(relation) ? predecessorTask.lateStart : predecessorTask.earlyStart
      return this.addLag(relation, start!)
    }

    // Predecessor started
    if (predecessorTask.actualFinish !== null) {
      // Predecessor finished
      // Successor not started
      return this.addLag(relation, predecessorTask.actualStart)
    }

    // Predecessor not finished
    // Successor not started
    const start = this.isAlap(relation) ? predecessorTask.lateStart : predecessorTask.earlyStart
    return this.addLag(relation, start!)
  }

  /**
   * Calculate the early start for the successor task in a start-finish relationship.
   *
   * @param relation relationship between two tasks
   * @return calculated early start date
   */
  private calculateEarlyStartForStartFinish(relation: Relation) {
    const predecessorTask = relation.predecessorTask
    if (predecessorTask.actualStart === null) {
      // Predecessor not started
      // Successor not started
      const start = this.isAlap(relation) ? predecessorTask.lateStart : predecessorTask.earlyStart
      return this.addLag(relation, this.getDateFromFinishAndDuration(relation.successorTask, start!)!)
    }

    // Predecessor started
    if (predecessorTask.actualFinish !== null) {
      // Predecessor finished
      // Successor not started
      const start = this.isAlap(relation) ? predecessorTask.lateStart : predecessorTask.earlyStart
      return this.addLag(relation, this.getDateFromFinishAndDuration(relation.successorTask, start!)!)
    }

    // Predecessor not finished
    // Successor not started
    const start = this.isAlap(relation) ? predecessorTask.lateStart : predecessorTask.earlyStart
    return this.addLag(relation, this.getDateFromFinishAndDuration(relation.successorTask, start!)!)
  }

  /**
   * Calculate the early start for the successor task in a finish-finish relationship.
   *
   * @param relation relationship between two tasks
   * @return calculated early start date
   */
  private calculateEarlyStartForFinishFinish(relation: Relation) {
    // There is an interesting bug in Project 2010, and possibly other versions, where the ES, and EF dates
    // for the predecessor of an FF task are not set correctly. Calculating the project shows the correct dates,
    // but when the file is saved and reopened, the incorrect dates are shown again. Current versions of MS Project (2024?)
    // seem to be unaffected.

    const predecessorTask = relation.predecessorTask

    if (predecessorTask.actualStart === null) {
      // Predecessor not started
      // Successor not started
      const finish = this.isAlap(relation) ? predecessorTask.lateFinish : predecessorTask.earlyFinish
      const earlyStart = this.addLag(relation, this.getDateFromFinishAndRemainingDuration(relation.successorTask, finish!)!)
      return isBefore(earlyStart, this.projectStartDate) ? this.projectStartDate : earlyStart

      // <original-java-code>
      // return earlyStart.isBefore(m_projectStartDate) ? m_projectStartDate : earlyStart;
      // </original-java-code>
    }

    // Predecessor started
    if (predecessorTask.actualFinish !== null) {
      // Predecessor finished
      // Successor not started
      const earlyStart = this.addLag(relation, this.getDateFromFinishAndRemainingDuration(relation.successorTask, predecessorTask.actualFinish)!)
      return isBefore(earlyStart, this.projectStartDate) ? this.projectStartDate : earlyStart
      // <original-java-code>
      // return earlyStart.isBefore(m_projectStartDate) ? m_projectStartDate : earlyStart;
      // </original-java-code>
    }

    // Predecessor not finished
    // Successor not started
    const finish = this.isAlap(relation) ? predecessorTask.lateFinish : predecessorTask.earlyFinish
    const earlyStart = this.addLag(relation, this.getDateFromFinishAndRemainingDuration(relation.successorTask, finish!)!)
    return isBefore(earlyStart, this.projectStartDate) ? this.projectStartDate : earlyStart

    // <original-java-code>
    // return earlyStart.isBefore(m_projectStartDate) ? m_projectStartDate : earlyStart;
    // </original-java-code>
  }

  /**
   * Calculate the late finish for the predecessor task in this relationship.
   *
   * @param relation relationship between two tasks
   * @return calculated late finish date
   */
  private calculateLateFinish(relation: Relation) {
    let lateFinish: Date

    switch (relation.type) {
      case RelationType.START_START: {
        lateFinish = this.calculateLateFinishForStartStart(relation)!
        break;
      }

      case RelationType.FINISH_FINISH: {
        lateFinish = this.calculateLateFinishForFinishFinish(relation);
        break;
      }

      case RelationType.START_FINISH: {
        lateFinish = this.calculateLateFinishForStartFinish(relation);
        break;
      }

      case RelationType.FINISH_START: {
        lateFinish = this.calculateLateFinishForFinishStart(relation);
        break;
      }
    }

    if (isAfter(lateFinish, this.projectFinishDate)) {
      return this.projectFinishDate
    }

    // <original-java-code>
    // if (lateFinish.isAfter(m_projectFinishDate)) {
    //   return m_projectFinishDate;
    // }
    // </original-java-code>

    return lateFinish;
  }

  /**
   * Calculate the late finish for the predecessor task in a start-start relationship.
   *
   * @param relation relationship between two tasks
   * @return calculated late finish date
   */
  private calculateLateFinishForStartStart(relation: Relation) {
    const predecessorTask = relation.predecessorTask
    const successorTask = relation.successorTask
    const calendar = predecessorTask.getEffectiveCalendar()

    let lateStart: Date | null
    let lateFinish: Date | null

    if (predecessorTask.actualStart === null) {
      // Predecessor not started
      if (successorTask.actualStart === null) {
        // Successor not started
        if (predecessorTask.mode == TaskMode.MANUALLY_SCHEDULED && successorTask.successors.length === 0) {
          lateFinish = successorTask.lateFinish
        }
        else {
          if (predecessorTask.mode == TaskMode.MANUALLY_SCHEDULED) {
            lateFinish = this.projectFinishDate;
          }
          else {
            lateStart = this.removeLag(relation, calendar.getNextWorkStart(successorTask.lateStart!));
            lateFinish = this.getDateFromStartAndDuration(predecessorTask, lateStart);
          }
        }
      }
      else {
        // successor started
        // successor not finished
        if (successorTask.successors.length === 0) {
          lateFinish = this.projectFinishDate
        }
        else {
          lateStart = this.getDateFromStartAndActualDuration(successorTask, successorTask.actualStart);
          lateFinish = this.getDateFromStartAndDuration(predecessorTask, lateStart!);
        }
      }
    }
    else {
      // Predecessor Started
      // Predecessor not finished
      if (successorTask.actualStart == null) {
        // Successor not started
        lateFinish = this.projectFinishDate;
      }
      else {
        // successor started
        // successor not finished
        lateFinish = this.projectFinishDate;
      }
    }

    return lateFinish;
  }

  /**
   * Calculate the late finish for the predecessor task in a finish-finish relationship.
   *
   * @param relation relationship between two tasks
   * @return calculated late finish date
   */
  private calculateLateFinishForFinishFinish(relation: Relation) {
    const predecessorTask = relation.predecessorTask
    const successorTask = relation.successorTask

    if (predecessorTask.actualStart === null) {
      // Predecessor not started
      if (successorTask.actualStart === null) {
        // Successor not started
        return this.removeLag(relation, relation.successorTask.lateFinish!);
      }

      // Successor started
      // Successor not finished
      return this.removeLag(relation, relation.successorTask.lateFinish!);
    }

    // Predecessor Started
    // Predecessor not finished
    if (successorTask.actualStart === null) {
      // Successor not started
      return this.removeLag(relation, relation.successorTask.lateFinish!);
    }

    // Successor started
    // Successor not finished
    return this.removeLag(relation, relation.successorTask.lateFinish!);
  }

  /**
   * Calculate the late finish for the predecessor task in a finish-start relationship.
   *
   * @param relation relationship between two tasks
   * @return calculated late finish date
   */
  private calculateLateFinishForFinishStart(relation: Relation) {
    const predecessorTask = relation.predecessorTask;
    const successorTask = relation.successorTask;

    if (predecessorTask.actualStart === null) {
      // Predecessor not started
      if (successorTask.actualStart === null) {
        // Successor not started
        return this.removeLag(relation, this.calculatedLateStart.get(successorTask) ?? successorTask.lateStart!);
      }

      // successor started
      // successor not finished
      return this.removeLag(relation, this.calculatedLateStart.get(successorTask) ?? successorTask.lateStart!);
    }

    // Predecessor Started
    // Predecessor not finished
    if (successorTask.actualStart === null) {
      // Successor not started
      return this.removeLag(relation, this.calculatedLateStart.get(successorTask) ?? successorTask.lateStart!);
    }

    // successor started
    // successor not finished
    return this.removeLag(relation, this.calculatedLateStart.get(successorTask) ?? successorTask.lateStart!);
  }

  /**
   * Calculate the late finish for the predecessor task in a start-finish relationship.
   *
   * @param relation relationship between two tasks
   * @return calculated late finish date
   */
  private calculateLateFinishForStartFinish(relation: Relation) {
    const predecessorTask = relation.predecessorTask;
    const successorTask = relation.successorTask;

    if (predecessorTask.actualStart === null) {
      // Predecessor not started
      if (successorTask.actualStart === null) {
        // Successor not started
        return this.removeLag(relation, this.getDateFromStartAndDuration(predecessorTask, successorTask.lateFinish!)!);
      }

      // successor started
      // successor not finished
      return this.removeLag(relation, this.getDateFromStartAndDuration(predecessorTask, successorTask.lateFinish!)!);
    }

    // Predecessor Started
    // Predecessor not finished
    if (successorTask.actualStart === null) {
      // Successor not started
      return this.removeLag(relation, this.getDateFromStartAndDuration(predecessorTask, successorTask.lateFinish!)!);
    }

    // successor started
    // successor not finished
    return this.removeLag(relation, this.getDateFromStartAndDuration(predecessorTask, successorTask.lateFinish!)!);
  }

  /**
    * Add leveling delay to a start date.
    *
    * @param task parent task
    * @param date start date
    * @return date with leveling delay
    */
  private addLevelingDelay(task: Task, date: Date): Date {
    let delay = task.levelingDelay
    if (delay === null || delay.duration === 0) {
      return date
    }

    if (!isElapsedTimeUnit(delay.units)) {
      const newTimeUnit = DURATION_UNITS_MAP.get(delay.units)
      if (!newTimeUnit) {
        throw new Error(`Unsupported TimeUnit ${delay.units}`)
      }
      delay = Duration.from(delay.duration, newTimeUnit)
    }

    const calendar = task.getEffectiveCalendar()
    // ensure we are in a working period
    const date2 = calendar.getNextWorkStart(date)
    return calendar.getDate(date2, delay)
  }

  /**
  * 判断任务是否可以编排
  */
  private isTask(task: Task) {
    return !((task.isSummary && !task.isExternalProject) || !task.isActive || task.isNull)
  }

  /**
   * Add lag to a date.
   *
   * @param relation relation between tasks
   * @param date date
   * @return date with lag
   */
  private addLag(relation: Relation, date: Date) {
    if (relation.lag.duration === 0) {
      return date
    }

    let lag = relation.lag
    if (lag.units === TimeUnit.PERCENT) {
      const predecessorDuration = relation.predecessorTask.duration
      lag = Duration.from((predecessorDuration.duration * lag.duration) / 100.0, predecessorDuration.units)
    }

    const calendar = relation.successorTask.getEffectiveCalendar()
    return calendar.getDate(date, lag)
  }

  /**
   * Remove lag from a date.
   *
   * @param relation relation between tasks
   * @param date date with lag
   * @return date without lag
   */
  private removeLag(relation: Relation, date: Date) {
    if (relation.lag.duration === 0) {
      return date
    }

    let lag = relation.lag
    if (lag.units === TimeUnit.PERCENT) {
      const predecessorDuration = relation.predecessorTask.duration
      lag = Duration.from((predecessorDuration.duration * lag.duration) / 100.0, predecessorDuration.units)
    }

    const calendar = relation.successorTask.getEffectiveCalendar()
    return calendar.getDate(date, Duration.negate(lag))
  }

  /**
   * Create temporary relationships between tasks to represent summary task logic.
   */
  private createSummaryTaskRelationships() {
    this.file.relationContainer.relations
      .filter(r => r.predecessorTask.isSummary || r.successorTask.isSummary)
      .forEach(it => {
        this.createSummaryTaskRelationship(it)
      })
  }

  /**
   * Create a temporary relationship to represent summary task logic.
   *
   * @param relation relationship representing summary task logic
   */
  private createSummaryTaskRelationship(relation: Relation) {
    let predecessors = [relation.predecessorTask]
    if (predecessors[0].isSummary) {
      switch (relation.type) {
        case RelationType.START_START:
        case RelationType.START_FINISH: {
          predecessors = [this.findEarliestSubtask(predecessors[0])].filter(isNonNullable)
          // <original-java-code>
          // predecessors = Collections.singletonList(findEarliestSubtask(predecessors.get(0)));
          // </original-java-code>
          break;
        }

        default: {
          predecessors = this.allChildTasks(predecessors[0]);
          break;
        }
      }
    }

    let successors = [relation.successorTask]
    if (successors[0].isSummary) {
      successors = this.allChildTasks(successors[0]);
    }
    
    // <original-java-code>
    // List<Task> successors = Collections.singletonList(relation.getSuccessorTask());
    // if (successors.get(0).getSummary()) {
    //   successors = allChildTasks(successors.get(0));
    // }
    // </original-java-code>

    for (const predecessor of predecessors) {
      for (const successor of successors) {
        const newRelation = Relation.from({
          ...relation,
          predecessorTask: predecessor,
          successorTask: successor,
        })
        getOrInsert(this.summaryTaskPredecessors, successor, []).push(newRelation)
        getOrInsert(this.summaryTaskSuccessors, predecessor, []).push(newRelation)
        // <original-java-code>
        // this.summaryTaskPredecessors.computeIfAbsent(successor, k -> new ArrayList<>()).add(newRelation);
        // this.summaryTaskSuccessors.computeIfAbsent(predecessor, k -> new ArrayList<>()).add(newRelation);
        // </original-java-code>
      }
    }
  }

 /**
   * Roll up dates to a summary task.
   *
   * @param parentTask parent summary task
   */
  private rollupDates(parentTask: Task) {
    // NOTE: summary tasks can be manually scheduled. We're currently ignoring this...
    if (parentTask.childTasks.length === 0) {
      return;
    }

    let finished = 0;
    let startDate = parentTask.start
    let finishDate = parentTask.finish
    let actualStartDate = parentTask.actualStart
    let actualFinishDate = parentTask.actualFinish
    let earlyStartDate = parentTask.earlyStart
    let earlyFinishDate = parentTask.earlyFinish
    let lateStartDate = parentTask.lateStart
    let lateFinishDate = parentTask.lateFinish
    let critical = null;

    for (const task of parentTask.childTasks) {
      if (task.isExternalTask) {
        continue;
      }

      this.rollupDates(task);

      // the child tasks can have null dates (e.g. for nested wbs elements with no task children) so we
      // still must protect against some children having null dates
      startDate = DateUtils.min(startDate, task.start);
      finishDate = DateUtils.max(finishDate, task.finish);
      actualStartDate = DateUtils.min(actualStartDate, task.actualStart);
      actualFinishDate = DateUtils.max(actualFinishDate, task.actualFinish);

      if (task.constraintType == ConstraintType.AS_LATE_AS_POSSIBLE) {
        earlyStartDate = DateUtils.min(earlyStartDate, task.lateStart);
        earlyFinishDate = DateUtils.max(earlyFinishDate, task.lateFinish);
      }
      else {
        earlyStartDate = DateUtils.min(earlyStartDate, task.earlyStart);
        earlyFinishDate = DateUtils.max(earlyFinishDate, task.earlyFinish);
      }

      if (task.mode == TaskMode.MANUALLY_SCHEDULED) {
        lateStartDate = DateUtils.min(lateStartDate, task.earlyStart);
        lateFinishDate = DateUtils.max(lateFinishDate, task.earlyFinish);
      }
      else {
        lateStartDate = DateUtils.min(lateStartDate, task.lateStart);
        lateFinishDate = DateUtils.max(lateFinishDate, task.lateFinish);
      }

      if (task.actualFinish != null) {
        ++finished;
      }

      critical = critical || task.isCritical;
    }

    parentTask.start = startDate;
    parentTask.finish = finishDate;
    parentTask.actualStart = actualStartDate;
    parentTask.earlyStart = earlyStartDate;
    parentTask.earlyFinish = earlyFinishDate;
    parentTask.lateStart = lateStartDate;
    parentTask.lateFinish = lateFinishDate;

    //
    // Only if all child tasks have actual finish dates do we
    // set the actual finish date on the parent task.
    //
    if (finished == parentTask.childTasks.length) {
      parentTask.actualFinish = actualFinishDate;
    }

    parentTask.isCritical = critical

    parentTask.duration = parentTask.getEffectiveCalendar().getWork(startDate!, finishDate!, TimeUnit.DAYS);
  }

  /**
   * Find the earliest child tasks from entire child task hierarchy.
   *
   * @param summaryTask parent summary task
   * @return earliest child task
   */
  private findEarliestSubtask(summaryTask: Task) {
    return min2(
      this.allChildTasks(summaryTask),
      it => it.earlyStart,
    )
  }

  /**
   * Find all child tasks from the entire child task hierarchy.
   *
   * @param summaryTask parent summary task
   * @return all child tasks
   */
  private allChildTasks(summaryTask: Task) {
    return this.allChildTasksRecursive(summaryTask, []);
  }

  /**
   * Find all child tasks from the entire child task hierarchy,
   * populating the childTasks list.
   *
   * @param summaryTask parent summary task
   * @param childTasks task list to populate
   * @return task list
   */
  private allChildTasksRecursive(summaryTask: Task, childTasks: Task[]) {
    childTasks.push(...summaryTask.childTasks.filter(t => !t.isSummary && t.isActive))
    summaryTask.childTasks.filter(it => {
      return it.isSummary
    }).forEach(it => {
      this.allChildTasksRecursive(it, childTasks)
    })
    return childTasks;
  }


  /**
   * Add task duration to a date.
   *
   * @param task parent task
   * @param date date
   * @return date plus duration
   */
  private getDateFromStartAndDuration(task: Task, date: Date) {
    if (this.useTaskEffectiveCalendar(task)) {
      return task.getEffectiveCalendar().getDate(date, task.duration)
    }

    return this.getDateFromStartAndWork(task, date)
  }

  /**
   * Add task actual duration to a date.
   *
   * @param task parent task
   * @param date date
   * @return date plus duration
   */
  private getDateFromStartAndActualDuration(task: Task, date: Date) {
    if (this.useTaskEffectiveCalendar(task)) {
      return task.getEffectiveCalendar().getDate(date, task.actualDuration)
    }

    return this.getDateFromStartAndActualWork(task, date)
  }

  /**
   * Subtract task duration from a date.
   *
   * @param task parent task
   * @param date date
   * @return date minus duration
   */
  private getDateFromFinishAndDuration(task: Task, date: Date) {
    if (this.useTaskEffectiveCalendar(task)) {
      return task.getEffectiveCalendar().getDate(date, Duration.negate(task.duration))
    }
    return this.getDateTimeFromFinishAndWork(task, date)
  }

  /**
   * Subtract task remaining duration from a date.
   *
   * @param task parent task
   * @param date date
   * @return date minus remaining duration
   */
  private getDateFromFinishAndRemainingDuration(task: Task, date: Date) {
    if (this.useTaskEffectiveCalendar(task)) {
      return task.getEffectiveCalendar().getDate(date, Duration.negate(task.remainingDuration))
    }
    return this.getDateFromFinishAndRemainingWork(task, date)
  }

  private useTaskEffectiveCalendar(task: Task) {
    return task.type === TaskType.FIXED_DURATION
      || !(this.getResourceAssignmentStream(task).length > 0)
  }

  /**
   * Find latest date by adding resource assignment work to a date.
   *
   * @param task parent task
   * @param date date
   * @return date plus work
   */
  private getDateFromStartAndWork(task: Task, date: Date) {
    return max(this.getResourceAssignmentStream(task).map((r) => {
      return this.getDateFromWork(r, date, r.work)
    }))
    // <original-java-code>
    // return getResourceAssignmentStream(task).map(r -> getDateFromWork(r, date, r.getWork())).max(Comparator.naturalOrder()).orElseGet(null);
    // </original-java-code>
  }

  /**
   * Find latest date by adding resource assignment actual work to a date.
   *
   * @param task parent task
   * @param date date
   * @return date plus work
   */
  private getDateFromStartAndActualWork(task: Task, date: Date) {
    return max(this.getResourceAssignmentStream(task).map((r) => {
      return this.getDateFromWork(r, date, r.actualWork)
    }))

    // <original-java-code>
    // return getResourceAssignmentStream(task).map(r -> getDateFromWork(r, date, r.getActualWork())).max(Comparator.naturalOrder()).orElseGet(null);
    // </original-java-code>
  }

  /**
  * 通过从日期中减去资源分配工作量来找到最早的日期
  *
  */
  private getDateTimeFromFinishAndWork(task: Task, date: Date) {
    const dates = this.getResourceAssignmentStream(task).map((r) => {
      return this.getDateFromWork(r, date, Duration.negate(r.work))
    })
    return min(dates)
  }

  /**
   * Find the earliest date by subtracting resource assignment remaining work from a date.
   *
   * @param task parent task
   * @param date date
   * @return date less work
   */
  private getDateFromFinishAndRemainingWork(task: Task, date: Date) {
    return min(
      this.getResourceAssignmentStream(task).map((r) => {
        return this.getDateFromWork(r, date, Duration.negate(r.remainingWork))
      }),
    )
    // <original-java-code>
    // return getResourceAssignmentStream(task).map(r -> getDateFromWork(r, date, r.getRemainingWork().negate())).min(Comparator.naturalOrder()).orElseGet(null);
    // </original-java-code>
  }

  /**
* 使用资源分配的有效日历将工作量添加到日期
*/
  private getDateFromWork(assignment: ResourceAssignment, date: Date, work: Duration): Date {
    const units = assignment.units
    const work2 = units !== 100.0
      ? Duration.from((work.duration * 100.0) / units, work.units)
      : work
    return assignment.getEffectiveCalendar().getDate(date, work2)
  }

  /**
   * Given a task and a finish date potentially at the start of a working period,
   * determine if there is an earlier equivalent finish date at the end of working
   * period which can be used instead.
   *
   * @param task parent task
   * @param date potential finish date
   * @return finish date
   */
  private getEquivalentPreviousWorkFinish(task: Task, date: Date) {
    if (this.useTaskEffectiveCalendar(task)) {
      return this.getEquivalentPreviousWorkFinishCalendar(task.getEffectiveCalendar(), date)
    }

    return max(this.getResourceAssignmentStream(task).map((r) => {
      return this.getEquivalentPreviousWorkFinishCalendar(r.getEffectiveCalendar(), date)
    }))

    // <original-java-code>
    // return getResourceAssignmentStream(task).map(r -> getEquivalentPreviousWorkFinish(r.getEffectiveCalendar(), date)).max(Comparator.naturalOrder()).orElse(null);
    // </original-java-code>
  }

  /**
   * Given a calendar and a finish date potentially at the start of a working period,
   * determine if there is an earlier equivalent finish date at the end of working
   * period which can be used instead.
   *
   * @param calendar target calendar
   * @param date potential finish date
   * @return finish date
   */
  private getEquivalentPreviousWorkFinishCalendar(calendar: ProjectCalendar, date: Date) {
    const previousWorkFinish = calendar.getPreviousWorkFinish(date)
    if (calendar.getWork(previousWorkFinish, date, TimeUnit.HOURS).duration === 0) {
      return previousWorkFinish
    }
    return date
  }

  /**
  * 给定任务和可能处于工作期间结束的开始日期，
  * 确定是否有一个更晚的等效开始日期在下一个工作期间的开始。
  *
  * @param task 父任务
  * @param date 潜在的开始日期
  * @return 开始日期
  */
  private getNextWorkStart(task: Task, date: Date) {
    if (this.useTaskEffectiveCalendar(task)) {
      return this.getNextWorkStartCalendar(task, task.getEffectiveCalendar(), date)
    }

    return min(this.getResourceAssignmentStream(task).map((r) => {
      return this.getNextWorkStartCalendar(task, r.getEffectiveCalendar(), date)
    }))

    // <original-java-code>
    //  return this.getResourceAssignmentStream(task).map((r) => this.getNextWorkStartCalendar(task, r.getEffectiveCalendar(), date)).min(Comparator.naturalOrder()).orElse(null)
    // </original-java-code>
  }

  /**
    * 给定任务、日历和可能处于工作期间结束的开始日期，
    * 确定是否有一个更晚的等效开始日期在下一个工作期间的开始。
    *
    * @param task 父任务
    * @param calendar 目标日历
    * @param date 潜在的开始日期
    * @return 开始日期
    */
  private getNextWorkStartCalendar(task: Task, calendar: ProjectCalendar, date: Date) {
    const nextWorkStart = calendar.getNextWorkStart(date)
    // 确保下一个工作开始在给定日期之后

    if (isAfter(nextWorkStart, date) && task.isMilestone && isEqual(calendar.getPreviousWorkFinish(date), date)) {
      // 里程碑可以位于工作期间的结束。
      return date
    }

    // <original-java-code>
    // if (nextWorkStart.isAfter(date) && task.isMilestone && calendar.getPreviousWorkFinish(date).isEqual(date)) {
    //    // 里程碑可以位于工作期间的结束。
    //    return date
    // }
    // </original-java-code>
    return nextWorkStart
  }

  private getResourceAssignmentStream(task: Task) {
    return task.assignments.filter((r) => r.resource !== null && r.resource.type === ResourceType.WORK && r.units > 0.0)
  }

  /**
   * Determine if this relation should have ALAP logic applied.
   *
   * @param relation target relation
   * @return true if ALAP logic should be applied
   */
  private isAlap(relation: Relation) {
    return relation.predecessorTask.constraintType === ConstraintType.AS_LATE_AS_POSSIBLE && relation.successorTask.constraintType !== ConstraintType.AS_LATE_AS_POSSIBLE && this.isBackwardPass
  }
}

const min = <T extends number | Date>(dates: T[]): T | null => {
  if (dates.length === 0) return null
  return dates.reduce((acc, it) => it < acc ? it : acc, dates[0])
}

const max = <T extends number | Date>(dates: T[]): T | null => {
  if (dates.length === 0) return null
  return dates.reduce((acc, it) => it > acc ? it : acc, dates[0])
}

const min2 = <T>(array: T[], fn: (it: T) => number | Date | null): T | null => {
  if (array.length === 0) return null
  return array.reduce((acc, it) => {
    const currentValue = fn(it)
    const accValue = fn(acc)
    if (currentValue !== null && accValue === null) {
      return it
    }
    if (currentValue === null && accValue !== null) {
      return acc
    }
    if (currentValue !== null && accValue !== null) {
      return currentValue < accValue ? it : acc
    }
    return acc
  }, array[0])
}

// 定义辅助函数
const getOrInsert = <K, V>(map: Map<K, V>, key: K, value: V): V => {
  if (map.has(key)) {
    return map.get(key)!
  }
  map.set(key, value)
  return value
}

const DURATION_UNITS_MAP = new Map<TimeUnit, TimeUnit>([
  [TimeUnit.MINUTES, TimeUnit.ELAPSED_MINUTES],
  [TimeUnit.HOURS, TimeUnit.ELAPSED_HOURS],
  [TimeUnit.DAYS, TimeUnit.ELAPSED_DAYS],
  [TimeUnit.WEEKS, TimeUnit.ELAPSED_WEEKS],
  [TimeUnit.MONTHS, TimeUnit.ELAPSED_MONTHS],
  [TimeUnit.YEARS, TimeUnit.ELAPSED_YEARS],
])
