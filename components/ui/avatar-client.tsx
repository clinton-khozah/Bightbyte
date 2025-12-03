"use client"

import * as React from "react"

// Dynamically import Avatar components to avoid SSR issues with @radix-ui/react-avatar
export const Avatar = React.forwardRef<any, any>((props, ref) => {
  const [components, setComponents] = React.useState<any>(null)
  
  React.useEffect(() => {
    import("./avatar").then(setComponents)
  }, [])
  
  if (!components) {
    return <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" {...props} ref={ref} />
  }
  
  return <components.Avatar {...props} ref={ref} />
})

Avatar.displayName = "Avatar"

export const AvatarImage = React.forwardRef<any, any>((props, ref) => {
  const [components, setComponents] = React.useState<any>(null)
  
  React.useEffect(() => {
    import("./avatar").then(setComponents)
  }, [])
  
  if (!components) return null
  return <components.AvatarImage {...props} ref={ref} />
})

AvatarImage.displayName = "AvatarImage"

export const AvatarFallback = React.forwardRef<any, any>((props, ref) => {
  const [components, setComponents] = React.useState<any>(null)
  
  React.useEffect(() => {
    import("./avatar").then(setComponents)
  }, [])
  
  if (!components) return null
  return <components.AvatarFallback {...props} ref={ref} />
})

AvatarFallback.displayName = "AvatarFallback"

