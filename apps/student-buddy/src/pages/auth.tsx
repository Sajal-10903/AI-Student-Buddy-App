import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { Button, Card, Input, Label } from "@/components/ui";
import { Mail, Lock, User, BrainCircuit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const res = await loginMutation.mutateAsync({ data: { email: formData.email, password: formData.password } });
        setAuth(res.accessToken, res.user);
        toast({ title: "Welcome back!", description: "Successfully logged in." });
        setLocation("/dashboard");
      } else {
        const res = await registerMutation.mutateAsync({ data: formData });
        setAuth(res.accessToken, res.user);
        toast({ title: "Account created!", description: "Welcome to Buddy.AI" });
        setLocation("/dashboard");
      }
    } catch (error: any) {
      toast({ 
        title: "Authentication Failed", 
        description: error?.message || "Please check your credentials and try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Background Image */}
      <img 
        src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover opacity-20"
      />
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10 px-4"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4 shadow-inner">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display font-bold">{isLogin ? "Welcome Back" : "Create Account"}</h1>
          <p className="text-muted-foreground mt-2">
            {isLogin ? "Enter your details to access your dashboard." : "Start your adaptive learning journey today."}
          </p>
        </div>

        <Card className="p-8 shadow-2xl shadow-primary/5 border-white/50 bg-white/90 backdrop-blur-xl">
          <div className="flex p-1 mb-8 bg-muted rounded-xl">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setIsLogin(true)}
            >
              Log In
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="John Doe" 
                  icon={<User className="w-5 h-5" />}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required={!isLogin}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                icon={<Mail className="w-5 h-5" />}
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                {isLogin && <a href="#" className="text-xs text-primary font-semibold hover:underline">Forgot?</a>}
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                icon={<Lock className="w-5 h-5" />}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                minLength={6}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full mt-6" 
              size="lg"
              isLoading={loginMutation.isPending || registerMutation.isPending}
            >
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
