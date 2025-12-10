"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect directly to dashboard, bypassing login
    router.replace("/admin/dashboard")
  }, [router])

  return null
}
