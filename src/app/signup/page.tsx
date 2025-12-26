"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Loader2, UserPlus, Lock } from "lucide-react"

const signupSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupFormValues = z.infer<typeof signupSchema>

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = React.useState(false)
  const [token, setToken] = React.useState<string | null>(null)

  React.useEffect(() => {
    const tokenParam = searchParams.get("token")
    if (!tokenParam) {
      toast.error("Invalid invitation link", {
        description: "No invitation token found in the URL.",
      })
      router.push("/login")
    } else {
      setToken(tokenParam)
    }
  }, [searchParams, router])

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (data: SignupFormValues) => {
    if (!token) {
      toast.error("Invalid invitation link")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/invites/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
          password: data.password,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create account" }))
        throw new Error(errorData.error || "Invalid or expired invitation token")
      }

      toast.success("Account created successfully", {
        description: "You can now log in with your email and password.",
      })

      router.push("/login?accountCreated=true")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred"
      toast.error("Error", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return null // Will redirect in useEffect
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

      {/* Signup Card */}
      <Card className="w-full max-w-md relative z-10 backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-500">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Create your account
              </CardTitle>
              <CardDescription className="mt-1.5 text-base">
                Set a password to complete your account setup
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-sm font-medium">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                          type="password"
                          placeholder="Confirm your password"
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
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
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

export default function SignupPage() {
  return (
    <Suspense fallback={
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/50 to-black/60" />
        </div>
        <Card className="w-full max-w-md relative z-10 backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}

