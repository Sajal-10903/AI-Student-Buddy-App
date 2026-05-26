import { Link } from "wouter";
import { Button } from "@/components/ui";
import { BrainCircuit, Sparkles, TrendingUp, Target, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden selection:bg-primary/20">
      {/* Navigation */}
      <nav className="absolute top-0 w-full z-50 px-6 py-6 max-w-7xl mx-auto inset-x-0 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-8 h-8 text-primary" />
          <span className="font-display font-bold text-2xl tracking-tight">AI Student Buddy</span>
        </div>
        <div className="flex gap-4">
          <Link href="/auth" className="hidden sm:inline-flex">
            <Button variant="ghost">Log In</Button>
          </Link>
          <Link href="/auth">
            <Button>Get Started <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center">
        
        {/* Background Decorative Image */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Hero background" 
            className="w-full h-full object-cover opacity-40 mix-blend-multiply"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="lg:w-1/2 text-center lg:text-left z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-6 border border-primary/20">
            <Sparkles className="w-4 h-4" />
            Powered by advanced AI models
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-extrabold text-foreground leading-[1.1] mb-6">
            Study smarter, not harder with <span className="text-gradient">AI.</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Generate custom quizzes, identify your weak areas, and get personalized study plans instantly. Elevate your learning experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link href="/auth">
              <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8">
                Start Learning Free
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg h-14 px-8 bg-white/50 backdrop-blur-sm">
                How it works
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="lg:w-1/2 mt-16 lg:mt-0 relative z-10"
        >
          {/* Abstract representation of UI */}
          <div className="relative w-full aspect-square max-w-lg mx-auto">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-[2.5rem] blur-3xl transform -rotate-6"></div>
            <div className="glass-card absolute inset-4 rounded-[2rem] p-6 flex flex-col shadow-2xl">
              <div className="h-8 w-1/3 bg-muted rounded-lg mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background/50">
                    <div className="w-6 h-6 rounded-full border-2 border-primary/30"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                ))}
              </div>
              <div className="mt-auto flex justify-between items-end">
                <div className="w-24 h-24 rounded-full border-8 border-primary border-t-secondary"></div>
                <div className="h-10 w-28 bg-primary rounded-xl"></div>
              </div>
            </div>
            
            {/* Floating badges */}
            <motion.div 
              animate={{ y: [0, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -right-4 top-1/4 glass-card px-4 py-3 rounded-2xl flex items-center gap-3 shadow-xl"
            >
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Accuracy</p>
                <p className="text-xs text-success font-semibold">+15% this week</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Everything you need to ace your exams</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Our AI analyzes your performance to create a learning path tailored uniquely to you.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Sparkles, title: "AI Quiz Generation", desc: "Instantly create high-quality multiple choice questions on any topic, at any difficulty level.", color: "text-primary bg-primary/10" },
              { icon: Target, title: "Target Weak Areas", desc: "Our system identifies concepts you struggle with and suggests targeted quizzes to improve them.", color: "text-secondary bg-secondary/10" },
              { icon: TrendingUp, title: "Detailed Analytics", desc: "Track your progress over time with beautiful charts and actionable insights.", color: "text-accent bg-accent/10" }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-3xl border border-border hover:shadow-xl transition-all duration-300 bg-background"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${feature.color}`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
