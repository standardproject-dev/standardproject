import { Canvas, Flex, Text } from "@canvas-ui/react";

type Props = {
  msgs: string[]
}

export function CanvasUIContent(props: Props) {
  
  const containerStyle = {
    width: 250,
    flexDirection: 'column',
  } as const
  const textStyle = {
    maxWidth: containerStyle.width,
    maxLines: 1,
  }
  const textEls = props.msgs.map((msg, i) => {
    return (
      <Text key={ i } style={ textStyle }>{ msg }</Text>
    )
  })
  return (
    <Canvas>
      <Flex style={ containerStyle }>
        { textEls }
      </Flex>
    </Canvas>
  )
}
