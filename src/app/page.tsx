// Import necessary components
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DataIcon,
  TuningIcon,
  AnalyticsIcon,
  StepOneIcon,
  StepTwoIcon,
  StepThreeIcon,
  LearningIcon,
  ContentIcon,
  SupportIcon,
  KnowledgeIcon,
  QuoteIcon,
} from "@/components/ui/icons";
import { Testimonial, TestimonialGrid } from "@/components/ui/testimonial";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold">Agennt</h1>
            <span className="text-sm bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
              Beta
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="outline">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section with Gradient Background */}
        <section className="relative py-24 px-4 overflow-hidden bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950">
          <div className="absolute inset-0 bg-grid-neutral-900/[0.03] dark:bg-grid-neutral-100/[0.03]" />
          <div className="container mx-auto max-w-6xl relative">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-1/2 space-y-6 stagger-animation">
                <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 mb-4 animate-fade-in">
                  <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse-slow"></span>
                  Now in public beta
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight animate-slide-up">
                  Deploy AI Agents with{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">
                    Personalized Knowledge
                  </span>
                </h1>
                <p className="text-xl text-neutral-600 dark:text-neutral-400 animate-slide-up">
                  Agennt unifies Supervised Fine-Tuning (SFT),
                  Retrieval-Augmented Generation (RAG), persona management, and
                  analytics into one turnkey platform.
                </p>
                <div className="flex flex-wrap gap-4 pt-2 animate-slide-up">
                  <Link href="/signup">
                    <Button
                      size="lg"
                      className="rounded-full shadow-lg hover:shadow-xl transition-all"
                    >
                      Get Started
                    </Button>
                  </Link>
                  <Link href="/demo">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full"
                    >
                      See Demo
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="lg:w-1/2 relative animate-fade-in">
                <div className="relative w-full aspect-square max-w-md mx-auto">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 blur-3xl animate-pulse-slow" />
                  <div className="absolute inset-0 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shadow-xl overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-violet-600" />
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex space-x-2">
                          <div className="h-3 w-3 rounded-full bg-red-500" />
                          <div className="h-3 w-3 rounded-full bg-yellow-500" />
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          Agent Chat
                        </div>
                      </div>
                      <div className="space-y-4 stagger-animation">
                        <div className="flex items-start gap-3 animate-slide-up">
                          <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-sm font-medium">
                            U
                          </div>
                          <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3 text-sm max-w-[80%]">
                            <p>
                              How can I improve customer retention for my SaaS
                              product?
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 justify-end animate-slide-up">
                          <div className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-3 text-sm max-w-[80%]">
                            <p>
                              Based on your product data, I recommend focusing
                              on three key areas:
                            </p>
                            <ol className="list-decimal pl-5 mt-2 space-y-1">
                              <li>
                                Improve onboarding - 40% of churned users didn't
                                complete setup
                              </li>
                              <li>
                                Add missing features from feedback database
                              </li>
                              <li>
                                Implement a loyalty program for 6+ month
                                subscribers
                              </li>
                            </ol>
                          </div>
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-medium">
                            A
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">
                All-in-One AI Agent Platform
              </h2>
              <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
                Everything you need to build, deploy, and manage AI agents with
                your own data and brand voice.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-animation">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden group animate-slide-up">
                <div className="h-1 w-full bg-blue-500 group-hover:bg-blue-400 transition-colors" />
                <CardHeader className="flex flex-row items-start space-y-0 pb-2">
                  <div className="mr-4 mt-1 bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <DataIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle>Data Ingestion</CardTitle>
                    <CardDescription>
                      Upload content from various sources
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>
                    Ingest content from YouTube videos, public URLs, PDFs, and
                    more with our unified interface. Automatic chunking and
                    embedding.
                  </p>
                </CardContent>
                <CardFooter>
                  <Link href="/features/ingestion">
                    <Button
                      variant="outline"
                      className="group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors"
                    >
                      Learn More
                    </Button>
                  </Link>
                </CardFooter>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden group animate-slide-up">
                <div className="h-1 w-full bg-violet-500 group-hover:bg-violet-400 transition-colors" />
                <CardHeader className="flex flex-row items-start space-y-0 pb-2">
                  <div className="mr-4 mt-1 bg-violet-100 dark:bg-violet-900/30 p-2 rounded-lg">
                    <TuningIcon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle>Fine-Tuning Studio</CardTitle>
                    <CardDescription>
                      Create personalized AI models
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>
                    Curate prompt-response pairs for SFT or let Agennt
                    automatically generate training examples. Maintain
                    consistent brand voice.
                  </p>
                </CardContent>
                <CardFooter>
                  <Link href="/features/fine-tuning">
                    <Button
                      variant="outline"
                      className="group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20 transition-colors"
                    >
                      Learn More
                    </Button>
                  </Link>
                </CardFooter>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden group animate-slide-up">
                <div className="h-1 w-full bg-emerald-500 group-hover:bg-emerald-400 transition-colors" />
                <CardHeader className="flex flex-row items-start space-y-0 pb-2">
                  <div className="mr-4 mt-1 bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                    <AnalyticsIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle>Analytics Dashboard</CardTitle>
                    <CardDescription>Track performance metrics</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>
                    Monitor ticket deflection rates, response times, user
                    satisfaction scores, and identify content gaps with our
                    comprehensive analytics.
                  </p>
                </CardContent>
                <CardFooter>
                  <Link href="/features/analytics">
                    <Button
                      variant="outline"
                      className="group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors"
                    >
                      Learn More
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-4 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">How It Works</h2>
              <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
                Get started in minutes with our simple three-step process
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-animation">
              <div className="flex flex-col items-center text-center animate-slide-up">
                <div className="mb-6 bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full transform transition-transform hover:scale-110">
                  <StepOneIcon
                    size={32}
                    className="text-blue-600 dark:text-blue-400"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">1. Upload Your Data</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Connect your knowledge base, documents, or content sources to
                  create your agent's foundation.
                </p>
              </div>

              <div className="flex flex-col items-center text-center animate-slide-up">
                <div className="mb-6 bg-violet-100 dark:bg-violet-900/30 p-4 rounded-full transform transition-transform hover:scale-110">
                  <StepTwoIcon
                    size={32}
                    className="text-violet-600 dark:text-violet-400"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  2. Define Your Persona
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Customize your agent's tone, style, and behavior to match your
                  brand identity.
                </p>
              </div>

              <div className="flex flex-col items-center text-center animate-slide-up">
                <div className="mb-6 bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-full transform transition-transform hover:scale-110">
                  <StepThreeIcon
                    size={32}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">3. Deploy & Optimize</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Launch your agent and continuously improve it with analytics
                  and user feedback.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section with Icons */}
        <section className="py-16 px-4 bg-neutral-100 dark:bg-neutral-900">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Key Use Cases</h2>
              <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
                Discover how Agennt can transform your business and user
                experience
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-start">
                  <div className="mr-4 bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                    <LearningIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">
                      Personal Learning Assistant
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                      Help with studying, research, and knowledge retention.
                      Personalized to your learning style.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></div>
                        <span>
                          Summarize complex materials in your preferred format
                        </span>
                      </li>
                      <li className="flex items-center text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></div>
                        <span>
                          Create practice questions from your study materials
                        </span>
                      </li>
                      <li className="flex items-center text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></div>
                        <span>
                          Explain concepts in a way that matches your learning
                          style
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-start">
                  <div className="mr-4 bg-violet-100 dark:bg-violet-900/30 p-3 rounded-lg">
                    <ContentIcon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">
                      Content Creation Companion
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                      Assist with writing, brainstorming, and maintaining
                      consistent style across all content.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mr-2"></div>
                        <span>
                          Generate content that matches your brand voice
                        </span>
                      </li>
                      <li className="flex items-center text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mr-2"></div>
                        <span>
                          Suggest improvements based on your best-performing
                          content
                        </span>
                      </li>
                      <li className="flex items-center text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mr-2"></div>
                        <span>
                          Adapt content for different platforms and audiences
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-start">
                  <div className="mr-4 bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-lg">
                    <SupportIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">
                      Customer Support Chatbot
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                      Deflect routine inquiries with citations; escalate complex
                      issues to human agents.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2"></div>
                        <span>
                          Provide accurate answers with citations to your
                          documentation
                        </span>
                      </li>
                      <li className="flex items-center text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2"></div>
                        <span>
                          Seamlessly escalate complex issues to human support
                        </span>
                      </li>
                      <li className="flex items-center text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2"></div>
                        <span>
                          Learn from interactions to improve future responses
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-start">
                  <div className="mr-4 bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg">
                    <KnowledgeIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">
                      Internal Knowledge Assistant
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                      Employees query policies, SOPs, and documentation via chat
                      with accurate citations.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-2"></div>
                        <span>
                          Instant access to company knowledge and procedures
                        </span>
                      </li>
                      <li className="flex items-center text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-2"></div>
                        <span>
                          Reduce time spent searching through documentation
                        </span>
                      </li>
                      <li className="flex items-center text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-2"></div>
                        <span>
                          Identify knowledge gaps in your documentation
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">
                What Our Customers Say
              </h2>
              <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
                Join hundreds of businesses already using Agennt to transform
                their AI capabilities
              </p>
            </div>

            <TestimonialGrid>
              <Testimonial
                quote="Agennt has transformed our customer support. We've seen a 40% reduction in ticket volume and our team can focus on complex issues while the AI handles routine questions."
                author="Sarah Johnson"
                role="Head of Customer Success"
                company="TechFlow Inc."
              />

              <Testimonial
                quote="The fine-tuning capabilities are incredible. Our AI now communicates with our exact brand voice, and customers can't tell the difference between our agents and the AI."
                author="Michael Chen"
                role="Marketing Director"
                company="Brandify"
              />

              <Testimonial
                quote="Setting up our knowledge base was surprisingly easy. Within a day, we had an AI assistant that could accurately answer questions about our internal policies."
                author="Alex Rodriguez"
                role="Operations Manager"
                company="GlobalCorp"
              />
            </TestimonialGrid>

            <div className="mt-12 text-center">
              <Link href="/case-studies">
                <Button variant="outline" className="rounded-full">
                  Read Customer Stories
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-br from-blue-600 to-violet-600 dark:from-blue-700 dark:to-violet-700 text-white">
          <div className="container mx-auto max-w-6xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Your AI Experience?
            </h2>
            <p className="text-xl opacity-90 max-w-3xl mx-auto mb-8">
              Join hundreds of businesses already using Agennt to build
              personalized AI agents with their own data and brand voice.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-neutral-100 rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                  Get Started for Free
                </Button>
              </Link>
              <Link href="/placeholder">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-white border-white hover:bg-white/10 rounded-full"
                >
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-12 px-4 bg-white dark:bg-neutral-950">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <h2 className="text-xl font-bold mb-4">Agennt</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                Deploy personalized AI agents with consistent tone and
                up-to-date knowledge.
              </p>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-4">
                Product
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/features"
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/placeholder"
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link
                    href="/placeholder"
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Changelog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-4">
                Resources
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/placeholder"
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/placeholder"
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    API Reference
                  </Link>
                </li>
                <li>
                  <Link
                    href="/placeholder"
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Guides
                  </Link>
                </li>
                <li>
                  <Link
                    href="/placeholder"
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-4">
                Company
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/placeholder"
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/placeholder"
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Customers
                  </Link>
                </li>
                <li>
                  <Link
                    href="/placeholder"
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    href="/placeholder"
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Agennt. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link
                href="/placeholder"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                Privacy Policy
              </Link>
              <Link
                href="/placeholder"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                Terms of Service
              </Link>
              <Link
                href="/placeholder"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
