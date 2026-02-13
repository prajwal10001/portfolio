import { useState, useEffect } from 'react';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/component/ui/card';
import { Badge } from '@/component/ui/badge';
import { Input } from '@/component/ui/input';
import { Textarea } from '@/component/ui/textarea';
import { WaveBackground } from '@/component/WaveBackground';
import { VoiceAgent } from '@/component/VoiceAgent';
// import PipecatVoiceAgent from '@/component/PipecatVoiceAgent';
import {
    Github,
    Linkedin,
    Mail,
    Moon,
    Mic,
    ArrowRight,
    User,
    MessageSquare
} from 'lucide-react';

// Project data
const projects = [
    {
        title: 'Semantic Chunker (LangChain)',
        description: 'Token-aware semantic chunker compatible with LangChain for efficient LLM context handling. Supports PDF, Markdown, and plain text with overlapping + smart merging logic for retriever-ready chunks (FAISS).',
        tags: ['LangChain', 'Python', 'FAISS', 'NLP'],
        github: 'https://github.com/prajwal10001/semantic-chunker-langchain',
    },
    {
        title: 'Real-time Voice AI Agent',
        description: 'Built real-time voice AI using Pipecat + Azure STT + Azure OpenAI GPT + Cartesia Sonic-3 TTS. WebSocket audio streaming with Silero VAD and custom Pocket TTS (~200ms latency, voice cloning).',
        tags: ['Pipecat', 'Azure', 'WebSockets', 'TTS/STT'],
        github: 'https://github.com/prajwal10001/pipecat_voice_agent',
    },
    {
        title: 'Document Intelligence Data Extraction',
        description: 'Full-stack platform using React + FastAPI + Azure AI Document Intelligence. Automated extraction from PDFs, invoices, receipts, CSVs with OCR confidence scoring and multi-agent Q&A.',
        tags: ['React', 'FastAPI', 'Azure AI', 'Agno'],
        github: 'https://github.com/prajwal10001/automatic-data-extraction',
    },
    {
        title: 'Memory Based RAG Chatbot',
        description: 'Context-aware chatbot integrating FAISS retrieval + MongoDB memory with GPT-4 for reasoning. AI counselor for visa, scholarships, and university recommendations with personalized guidance.',
        tags: ['RAG', 'FAISS', 'MongoDB', 'GPT-4'],
        github: 'https://github.com/prajwal10001/Memory_based_RAG_chatbot',
    },
];

// Hero content for cycling
const heroStates = [
    {
        badge: 'AI Assistant',
        titleLine1: 'Talk to',
        titleLine2: 'Maya',
        subtitle: 'To know about my experience and projects.',
        showButtons: false,
    },
    {
        badge: 'AI Engineer & Architect',
        titleLine1: 'Prajwal',
        titleLine2: 'Mandale',
        subtitle: 'AI Engineer & Architect specializing in Generative AI, LLMs, and Scalable Infrastructure.',
        showButtons: true,
    },
];

function App() {
    const [currentHero, setCurrentHero] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [isVoiceAgentOpen, setIsVoiceAgentOpen] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            // Fade out
            setIsVisible(false);

            // After fade out, switch content and fade in
            setTimeout(() => {
                setCurrentHero((prev) => (prev + 1) % heroStates.length);
                setIsVisible(true);
            }, 500); // 500ms for fade out transition

        }, 4000); // Change every 4 seconds (3s visible + 0.5s fade out + 0.5s fade in)

        return () => clearInterval(interval);
    }, []);

    const hero = heroStates[currentHero];

    return (
        <div className="min-h-screen text-foreground relative overflow-x-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <span className="font-semibold text-lg">prajwal mandale</span>
                        <div className="flex items-center gap-4">
                            <a href="https://github.com/prajwal10001" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                                <Github className="size-5" />
                            </a>
                            <a href="https://www.linkedin.com/in/prajwal-mandale" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                                <Linkedin className="size-5" />
                            </a>
                            <a href="mailto:prajwal.mandale333@gmail.com" className="text-muted-foreground hover:text-foreground transition-colors">
                                <Mail className="size-5" />
                            </a>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <a href="#projects" className="text-muted-foreground hover:text-foreground transition-colors">
                            Projects
                        </a>
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <Moon className="size-5" />
                        </button>
                        <Button className="rounded-full bg-primary/40 border border-primary/50 backdrop-blur-md hover:bg-primary/50 btn-shine">
                            Reach Out
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section with Cycling Content */}
            <section className="relative flex min-h-screen items-center overflow-hidden pt-20">
                {/* Solid Background */}
                <div className="absolute inset-0 bg-background" />

                {/* Canvas Layer */}
                <div className="absolute inset-0 overflow-hidden z-0">
                    <WaveBackground />

                    {/* Gradients Over Canvas */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50 pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background pointer-events-none" />

                    {/* Central Glow */}
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(rgba(138, 40, 48, 0.25) 0%, rgba(178, 52, 62, 0.1) 40%, rgba(0, 0, 0, 0) 70%)' }}
                    />
                </div>

                {/* Grid Pattern */}
                <div className="pointer-events-none absolute inset-0 bg-grid mask-radial-faded opacity-40" />

                {/* Main Spotlight */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: 'radial-gradient(1000px 600px at 50% -20%, oklch(0.40 0.18 16 / 0.25) 0%, oklch(0.29 0.17 15 / 0.1) 30%, rgba(0, 0, 0, 0) 60%)' }}
                />

                {/* Ambient Blobs */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -right-40 top-40 h-[500px] w-[500px] rounded-full bg-[oklch(0.42_0.14_10_/_0.08)] blur-[120px]" />
                    <div className="absolute -left-20 top-60 h-[300px] w-[300px] rounded-full bg-[oklch(0.52_0.16_10_/_0.06)] blur-[80px]" />
                </div>

                {/* Content with Transitions */}
                <div className="container relative z-10 mx-auto px-4 py-16 md:py-24">
                    <div className="relative mx-auto max-w-4xl text-center">

                        {/* Badge - with transition */}
                        <div
                            className={`mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 backdrop-blur-sm transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                                }`}
                        >
                            <Mic className="h-3.5 w-3.5 text-primary" />
                            <span className="text-sm font-medium text-primary">{hero.badge}</span>
                        </div>

                        {/* Heading - with transition */}
                        <h1
                            className={`mb-6 font-serif text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl xl:text-7xl text-white transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                                }`}
                            style={{ transitionDelay: isVisible ? '100ms' : '0ms' }}
                        >
                            <span className="block">{hero.titleLine1}</span>
                            <span className="gradient-text">{hero.titleLine2}</span>
                        </h1>

                        {/* Subheading - with transition */}
                        <p
                            className={`mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                                }`}
                            style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}
                        >
                            {hero.subtitle}
                        </p>

                        {/* Buttons - with transition, only show on second state */}
                        <div
                            className={`flex flex-col items-center justify-center gap-4 sm:flex-row transition-all duration-500 ease-out ${isVisible && hero.showButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                                }`}
                            style={{ transitionDelay: isVisible ? '300ms' : '0ms' }}
                        >
                            <a
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer rounded-md h-12 px-8 text-base bg-primary/40 border border-primary/50 backdrop-blur-md hover:bg-primary/50 hover:border-primary/60 text-white transition-all duration-300 btn-shine shadow-[0_0_30px_-5px] shadow-primary/30 hover:shadow-[0_0_40px_-5px] hover:shadow-primary/40"
                                href="#projects"
                            >
                                View Projects
                                <ArrowRight className="h-4 w-4" />
                            </a>
                            <button
                                onClick={() => setIsVoiceAgentOpen(true)}
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer rounded-md h-12 px-8 text-base bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 hover:border-white/20 transition-all duration-300 btn-shine"
                            >
                                <Mic className="h-4 w-4" />
                                Talk to Maya
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Fade */}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/90 to-transparent" />
            </section>

            {/* Projects Section */}
            <section id="projects" className="relative py-24 px-4">
                <div className="absolute inset-0 bg-background" />
                <div className="pointer-events-none absolute inset-0 bg-grid mask-radial-faded opacity-20" />

                <div className="container mx-auto relative z-10">
                    <h2 className="font-serif text-5xl md:text-6xl text-center mb-16 text-white font-bold">
                        Selected <span className="gradient-text">Works</span>
                    </h2>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {projects.map((project, index) => (
                            <Card
                                key={index}
                                className="bg-white/[0.03] backdrop-blur-sm border-white/10 hover:border-primary/50 transition-all duration-500 overflow-hidden group relative"
                            >
                                {/* Top gradient accent bar */}
                                <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary/30 to-transparent group-hover:from-primary group-hover:via-primary/50 transition-all duration-500" />

                                <CardHeader className="pb-3 pt-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <CardTitle className="text-xl font-semibold text-white group-hover:text-primary/90 transition-colors duration-300">
                                            {project.title}
                                        </CardTitle>
                                        <span className="text-xs font-mono text-white/20 mt-1 shrink-0">
                                            0{index + 1}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-muted-foreground mb-5 leading-relaxed">
                                        {project.description}
                                    </CardDescription>
                                    <div className="flex flex-wrap gap-2 mb-5">
                                        {project.tags.map((tag) => (
                                            <Badge
                                                key={tag}
                                                variant="outline"
                                                className="text-xs border-primary/20 text-primary/70 bg-primary/5"
                                            >
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                    <a
                                        href={project.github}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-primary transition-colors duration-300 group/link"
                                    >
                                        <Github className="size-4" />
                                        View Project in GitHub
                                        <ArrowRight className="size-3.5 group-hover/link:translate-x-1 transition-transform duration-300" />
                                    </a>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="relative py-24 px-4">
                <div className="absolute inset-0 bg-background" />
                <div className="pointer-events-none absolute inset-0 bg-grid mask-radial-faded opacity-20" />

                <div className="container mx-auto max-w-xl relative z-10">
                    <h2 className="font-serif text-5xl md:text-6xl text-center mb-4 text-white font-bold">
                        Let's <span className="gradient-text">Chat</span>
                    </h2>
                    <p className="text-center text-muted-foreground mb-12">
                        Have a project in mind? Send me a message.
                    </p>

                    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                        <CardContent className="pt-6 space-y-6">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    <User className="size-4" />
                                    Name
                                </label>
                                <Input
                                    placeholder="Your name"
                                    className="bg-white/5 border-white/10 focus:border-primary"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    <Mail className="size-4" />
                                    Email
                                </label>
                                <Input
                                    type="email"
                                    placeholder="john@example.com"
                                    className="bg-white/5 border-white/10 focus:border-primary"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    <MessageSquare className="size-4" />
                                    Message
                                </label>
                                <Textarea
                                    placeholder="Tell me about your project..."
                                    rows={5}
                                    className="bg-white/5 border-white/10 focus:border-primary resize-none"
                                />
                            </div>

                            <button className="w-full inline-flex items-center justify-center gap-2 font-medium rounded-md h-12 px-8 text-base bg-primary/40 border border-primary/50 backdrop-blur-md hover:bg-primary/50 hover:border-primary/60 text-white transition-all duration-300 btn-shine shadow-[0_0_30px_-5px] shadow-primary/30">
                                Send Message
                            </button>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative border-t border-white/10 py-8">
                <div className="absolute inset-0 bg-background" />
                <div className="container mx-auto px-4 text-center text-muted-foreground relative z-10">
                    <p>© 2026 Prajwal Mandale. Built with React & TailwindCSS.</p>
                </div>
            </footer>

            {/* Voice Agent Modal */}
            <VoiceAgent
                isOpen={isVoiceAgentOpen}
                onClose={() => setIsVoiceAgentOpen(false)}
            />
            {/* <PipecatVoiceAgent /> */}
        </div>
    );
}

export default App;
