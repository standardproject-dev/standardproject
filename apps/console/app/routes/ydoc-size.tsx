import { Button } from "@standardproject/ui/components/button";
import { FieldError, Label } from "@standardproject/ui/components/field";
import { Input, TextField } from "@standardproject/ui/components/textfield";
import React from "react";
import { Form } from "react-aria-components";
import type { Route } from "./+types/ydoc-size";
 
export function clientLoader() {
  return {
    message: 'Hello from YDoc Size',
    size: window.localStorage.getItem('ydoc-size')
  }
}

export default function YDocSize(props: Route.ComponentProps) {

  let size = 0
  size++
  window.localStorage.setItem('ydoc-size', size.toString())

  React.useEffect(() => {

    window.localStorage.setItem('ydoc-size', '0')

  }, [])

  return (
    <div>
      <h1>YDoc Size</h1>
      <Form className="flex flex-col gap-2">
      <TextField name="email" type="email" isRequired>
        <Label>Email</Label>
        <Input />
        <FieldError />
      </TextField>
      <Button className="w-fit" type="submit">
        Submit
      </Button>
    </Form>
    </div>
  )
}
