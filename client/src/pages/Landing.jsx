import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
  ShieldCheckIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon,
  MoonIcon,
  SunIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  SparklesIcon,
  HeartIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import OpenConnectLogo from '../components/OpenConnectLogo.jsx';

const faqs = [
  {
    question: "How does End-to-End Encryption work?",
    answer: "OpenConnect uses the Web Crypto API to secure your messages. Your encryption keys are generated and stored only on your device. Every message is locked before it leaves your phone or computer, meaning not even our servers can read what you send."
  },
  {
    question: "Are audio and video calls also secure?",
    answer: "Absolutely. Our calling feature establishes a direct peer-to-peer WebRTC connection between you and your friends. This ensures your video and audio streams are private, ultra-fast, and bypass central servers entirely."
  },
  {
    question: "Is OpenConnect free to use?",
    answer: "Yes, OpenConnect is completely free. We believe that privacy is a fundamental right, not a premium feature. You get unlimited messaging, high-quality video calls, and full end-to-end encryption at no cost."
  },
  {
    question: "What happens if I lose my connection while sending a photo?",
    answer: "Our app is built to be resilient. If your connection drops, your media uploads will safely pause and gracefully retry using local cache mechanisms, ensuring your photos and videos are delivered the moment you're back online."
  }
];

const testimonials = [
  {
    quote: "Finally, a messaging app that looks beautiful and respects my privacy. The dark mode is stunning, and I love knowing my conversations are actually private.",
    author: "Aarav Sharma",
    role: "Digital Artist"
  },
  {
    quote: "The video call quality is insane. I use it to catch up with my family overseas and we never experience any of the lag we used to get on other platforms.",
    author: "Ishani Patel",
    role: "Travel Blogger"
  },
  {
    quote: "We moved our entire friend group chat here. The real-time typing indicators and instant media sharing make it the best social app we've used.",
    author: "Rohan Mehra",
    role: "Community Moderator"
  }
];

export default function Landing() {
  const { token } = useAuth();
  const { dark, toggle } = useTheme();
  
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  
  const yBg = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const yText = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const opacityText = useTransform(scrollYProgress, [0, 1], [1, 0]);

  const [openFaq, setOpenFaq] = useState(null);

  const features = [
    {
      title: 'Total Privacy',
      description: 'Your conversations belong to you. With default end-to-end encryption, nobody else can read your messages.',
      icon: ShieldCheckIcon,
    },
    {
      title: 'Crystal Clear Calls',
      description: 'Catch up face-to-face with high-definition video and uncompressed audio calls via peer-to-peer connections.',
      icon: VideoCameraIcon,
    },
    {
      title: 'Instant Delivery',
      description: 'See when your friends are typing and know exactly when they read your messages in real-time.',
      icon: BoltIcon,
    },
    {
      title: 'Stunning Design',
      description: 'A beautifully crafted dark mode interface featuring smooth animations and a premium glass aesthetic.',
      icon: MoonIcon,
    },
    {
      title: 'Group Chats',
      description: 'Bring everyone together. Share high-quality photos, files, and inside jokes seamlessly in your communities.',
      icon: ChatBubbleLeftRightIcon,
    },
    {
      title: 'Fast & Reliable',
      description: 'Built on edge networks so your messages deliver instantly, no matter where your friends are located.',
      icon: GlobeAltIcon,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30 selection:text-primary transition-colors duration-300">
      {/* ── Island Navbar ── */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl rounded-full glass border border-white/10 px-6 py-3 transition-all duration-300 shadow-2xl backdrop-blur-xl bg-background/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OpenConnectLogo size={28} className="text-primary drop-shadow-[0_0_8px_rgba(255,100,0,0.5)]" />
            <span className="font-sora text-lg font-bold tracking-tight">OpenConnect</span>
          </div>
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggle}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </motion.button>
            {token ? (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/app" className="neu-button-primary rounded-full px-5 py-2 text-sm">
                  Open Chats
                </Link>
              </motion.div>
            ) : (
              <>
                <Link to="/login" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block transition-colors">
                  Sign In
                </Link>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/register" className="neu-button-primary rounded-full px-5 py-2 text-sm">
                    Get Started
                  </Link>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section ref={heroRef} className="relative flex min-h-screen items-center justify-center pt-24 pb-12">
        <motion.div 
          className="absolute inset-0 dot-bg z-0 opacity-40"
          style={{ y: yBg }}
        />
        
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

        <motion.div 
          className="relative z-10 flex max-w-5xl flex-col items-center px-6 text-center"
          style={{ y: yText, opacity: opacityText }}
        >
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="font-sora text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-[5.5rem] leading-[1.1]"
          >
            Connect freely. <br className="hidden sm:block" />
            <span className="gradient-text">Chat securely.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
            className="mt-8 max-w-3xl text-lg text-muted-foreground sm:text-xl leading-relaxed"
          >
            A premium social messaging experience built for you and your friends. Enjoy flawless video calls, instant messaging, and absolute privacy with zero-knowledge encryption. 
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="mt-12 flex flex-col sm:flex-row gap-5"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to={token ? "/app" : "/register"} className="neu-button-primary px-8 py-4 text-base shadow-[0_0_30px_rgba(255,100,0,0.2)] hover:shadow-[0_0_40px_rgba(255,100,0,0.4)] transition-all">
                Start Chatting Now
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <a href="#features" className="neu-button px-8 py-4 text-base bg-transparent border-white/20 hover:bg-white/5">
                Explore Features
              </a>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Capabilities Grid ── */}
      <section id="features" className="relative z-20 bg-card py-28 border-y border-border/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center max-w-3xl mx-auto">
            <h2 className="font-sora text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need in a modern chat app.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Designed from the ground up to be fast, beautiful, and completely secure.
            </p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => (
              <motion.div 
                key={feature.title} 
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative overflow-hidden border border-border/50 bg-background/50 p-8 transition-colors hover:bg-accent/30 hover:border-primary/40 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-primary/10"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center border border-border/60 bg-secondary group-hover:border-primary/50 group-hover:bg-primary/10 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-3 font-sora text-xl font-bold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="relative z-20 py-28 bg-background">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="font-sora text-3xl font-bold tracking-tight sm:text-4xl">
              Loved by communities everywhere.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {testimonials.map((test, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col justify-between border border-border/50 bg-card p-8 shadow-sm"
              >
                <p className="text-muted-foreground leading-relaxed italic mb-8">
                  "{test.quote}"
                </p>
                <div>
                  <p className="font-bold text-foreground font-sora">{test.author}</p>
                  <p className="text-xs text-primary font-medium mt-1 uppercase tracking-wide">{test.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="relative z-20 bg-card py-28 border-y border-border/40">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-12 text-center">
            <h2 className="font-sora text-3xl font-bold tracking-tight sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border border-border/50 bg-background overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between p-6 text-left hover:bg-accent/30 transition-colors"
                >
                  <span className="font-sora font-semibold">{faq.question}</span>
                  <ChevronDownIcon 
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`} 
                  />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-6 pb-6 pt-2 text-muted-foreground leading-relaxed text-sm border-t border-border/20">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-card to-background z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-sora text-4xl font-bold sm:text-5xl"
          >
            Ready to join the conversation?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-xl text-muted-foreground"
          >
            Create an account and invite your friends today. Free forever.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-10"
          >
            <Link to="/register" className="neu-button-primary px-10 py-5 text-lg">
              Create Free Account
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Premium Footer ── */}
      <footer className="relative z-20 border-t border-border/40 bg-background pt-20 pb-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <OpenConnectLogo size={32} className="text-primary" />
                <span className="font-sora text-2xl font-bold tracking-tight">OpenConnect</span>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-xs">
                The next generation of private messaging. Secure, beautiful, and completely free.
              </p>
              <div className="flex gap-4">
                {['Twitter', 'Instagram', 'GitHub', 'LinkedIn'].map((social) => (
                  <motion.a
                    key={social}
                    href={`/${social.toLowerCase()}`}
                    whileHover={{ y: -3, color: 'var(--primary)' }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {social}
                  </motion.a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-sora font-bold mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link to="/features" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link to="/security" className="hover:text-primary transition-colors">Security</Link></li>
                <li><Link to="/download" className="hover:text-primary transition-colors">Download</Link></li>
                <li><Link to="/updates" className="hover:text-primary transition-colors">Latest Updates</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-sora font-bold mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link to="/help" className="hover:text-primary transition-colors">Help Center</Link></li>
                <li><Link to="/safety" className="hover:text-primary transition-colors">Safety Tips</Link></li>
                <li><Link to="/faq" className="hover:text-primary transition-colors">FAQs</Link></li>
                <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-sora font-bold mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border/20 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} OpenConnect. All rights reserved.
            </p>
            <div className="flex gap-8 text-xs text-muted-foreground">
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link to="/cookies" className="hover:text-primary transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
