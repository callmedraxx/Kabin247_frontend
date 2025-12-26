"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"
import { Loader2, UserCog, Mail, Lock } from "lucide-react"

const setupAdminSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type SetupAdminFormValues = z.infer<typeof setupAdminSchema>

export default function SetupAdminPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<SetupAdminFormValues>({
    resolver: zodResolver(setupAdminSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: SetupAdminFormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/setup-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to setup admin account")
      }

      toast.success("Admin account created successfully", {
        description: "You can now log in with your credentials.",
      })

      // Redirect to login page
      router.push("/login")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred"
      toast.error("Error", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/assets/login-background.jpg"
          alt="Private jet interior background"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        {/* Gradient overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/50 to-black/60" />
      </div>

      {/* Setup Admin Card */}
      <Card className="w-full max-w-md relative z-10 backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-500">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <UserCog className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Setup Admin Account
              </CardTitle>
              <CardDescription className="mt-1.5 text-base">
                Create the initial administrator account for Kabin247
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                          type="email"
                          placeholder="admin@kabin247.com"
                          className="pl-9 h-11"
                          {...field}
                          disabled={isLoading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-sm font-medium">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                          type="password"
                          placeholder="Enter password (min. 8 characters)"
                          className="pl-9 h-11"
                          {...field}
                          disabled={isLoading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserCog className="mr-2 h-4 w-4" />
                    Create Admin Account
                  </>
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80 hover:underline transition-colors">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

