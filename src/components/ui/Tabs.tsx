'use client'

import { createContext, useContext, useState, ReactNode, HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  activeTab: string
  setActiveTab: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue: string
  children: ReactNode
}

const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ defaultValue, children, className, ...props }, ref) => {
    const [activeTab, setActiveTab] = useState(defaultValue)

    return (
      <TabsContext.Provider value={{ activeTab, setActiveTab }}>
        <div ref={ref} className={cn('w-full', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    )
  }
)
Tabs.displayName = 'Tabs'

const TabsList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex gap-1 p-1 bg-[#1A1A2E] rounded-lg w-fit',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
TabsList.displayName = 'TabsList'

interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string
}

const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = useContext(TabsContext)
    if (!context) throw new Error('TabsTrigger must be used within Tabs')

    const isActive = context.activeTab === value

    return (
      <button
        ref={ref}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
          isActive
            ? 'bg-eha-red text-white'
            : 'text-gray-400 hover:text-white hover:bg-[#252540]',
          className
        )}
        onClick={() => context.setActiveTab(value)}
        {...props}
      >
        {children}
      </button>
    )
  }
)
TabsTrigger.displayName = 'TabsTrigger'

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string
}

const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = useContext(TabsContext)
    if (!context) throw new Error('TabsContent must be used within Tabs')

    if (context.activeTab !== value) return null

    return (
      <div ref={ref} className={cn('mt-4', className)} {...props}>
        {children}
      </div>
    )
  }
)
TabsContent.displayName = 'TabsContent'

export { Tabs, TabsList, TabsTrigger, TabsContent }
