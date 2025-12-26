"use client"

import * as React from "react"
import { CaterersProvider } from "./caterers-context"
import { AirportsProvider } from "./airports-context"
import { ClientsProvider } from "./clients-context"
import { MenuItemsProvider } from "./menu-items-context"
import { FBOsProvider } from "./fbos-context"

export function DataProviders({ children }: { children: React.ReactNode }) {
  return (
    <CaterersProvider>
      <AirportsProvider>
        <ClientsProvider>
          <MenuItemsProvider>
            <FBOsProvider>
              {children}
            </FBOsProvider>
          </MenuItemsProvider>
        </ClientsProvider>
      </AirportsProvider>
    </CaterersProvider>
  )
}

