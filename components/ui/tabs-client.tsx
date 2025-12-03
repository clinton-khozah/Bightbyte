"use client"

import * as React from "react"

// Dynamically import Tabs components to avoid SSR issues with @radix-ui/react-tabs
export const Tabs = React.forwardRef<any, any>((props, ref) => {
  const [components, setComponents] = React.useState<any>(null)
  
  React.useEffect(() => {
    import("./tabs").then(setComponents)
  }, [])
  
  if (!components) {
    return <div {...props} ref={ref} />
  }
  
  return <components.Tabs {...props} ref={ref} />
})

Tabs.displayName = "Tabs"

export const TabsList = React.forwardRef<any, any>((props, ref) => {
  const [components, setComponents] = React.useState<any>(null)
  
  React.useEffect(() => {
    import("./tabs").then(setComponents)
  }, [])
  
  if (!components) return null
  return <components.TabsList {...props} ref={ref} />
})

TabsList.displayName = "TabsList"

export const TabsTrigger = React.forwardRef<any, any>((props, ref) => {
  const [components, setComponents] = React.useState<any>(null)
  
  React.useEffect(() => {
    import("./tabs").then(setComponents)
  }, [])
  
  if (!components) return null
  return <components.TabsTrigger {...props} ref={ref} />
})

TabsTrigger.displayName = "TabsTrigger"

export const TabsContent = React.forwardRef<any, any>((props, ref) => {
  const [components, setComponents] = React.useState<any>(null)
  
  React.useEffect(() => {
    import("./tabs").then(setComponents)
  }, [])
  
  if (!components) return null
  return <components.TabsContent {...props} ref={ref} />
})

TabsContent.displayName = "TabsContent"

