"use client"

import * as React from "react"
import { CaterersProvider } from "./caterers-context"
import { AirportsProvider } from "./airports-context"
import { ClientsProvider } from "./clients-context"
import { MenuItemsProvider } from "./menu-items-context"
import { FBOsProvider } from "./fbos-context"
import { OfflineProvider } from "./offline-context"
import { OrdersProvider } from "./orders-context"

export function DataProviders({ children }: { children: React.ReactNode }) {
  return (
    <OfflineProvider>
      <CaterersProvider>
        <AirportsProvider>
          <ClientsProvider>
            <MenuItemsProvider>
              <FBOsProvider>
                <OrdersProvider>
                  {children}
                </OrdersProvider>
              </FBOsProvider>
            </MenuItemsProvider>
          </ClientsProvider>
        </AirportsProvider>
      </CaterersProvider>
    </OfflineProvider>
  )
}

