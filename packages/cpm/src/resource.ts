export enum ResourceType {
  MATERIAL = 0,
  WORK = 1,
  COST = 2,
}

export const ResourceTypeProps = [
  { name: 'Material', value: ResourceType.MATERIAL },
  { name: 'Work', value: ResourceType.WORK },
  { name: 'Cost', value: ResourceType.COST },
] as const

export interface Resource {
  type: ResourceType
}
