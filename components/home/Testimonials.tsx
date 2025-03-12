'use client';

import { motion } from 'framer-motion';

const testimonials = [
  {
    quote: "Turbo Grant transformed our grant writing process. What used to take months now takes weeks, with better results.",
    author: "Dr. Sarah Chen",
    role: "Principal Investigator",
    institution: "Research Institute"
  },
  {
    quote: "The AI-assisted writing and requirement validation saved us countless hours of revision cycles.",
    author: "Prof. Michael Rodriguez",
    role: "Department Chair",
    institution: "University Research"
  },
]

const stats = [
  { label: 'Successful Applications', value: '500+' },
  { label: 'in Secured Funding', value: '$250M+' },
  { label: 'Research Institutions', value: '100+' },
]

export default function Testimonials() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl lg:text-center"
        >
          <h2 className="text-base font-semibold leading-7 text-gray-600">Trusted by Researchers</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Join hundreds of successful grant recipients
          </p>
        </motion.div>
        
        {/* Stats */}
        <dl className="mt-16 grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="mx-auto flex max-w-xs flex-col gap-y-4"
            >
              <dt className="text-base leading-7 text-gray-500">{stat.label}</dt>
              <dd className="order-first text-3xl font-semibold tracking-tight text-black sm:text-5xl font-heading">
                {stat.value}
              </dd>
            </motion.div>
          ))}
        </dl>

        {/* Testimonials */}
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-sm leading-6 text-gray-900 sm:mt-20 sm:grid-cols-2 lg:mx-0 lg:max-w-none">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="relative bg-gray-50 px-6 py-8 rounded-2xl"
            >
              <blockquote>
                <p className="text-lg font-semibold text-gray-900">"{testimonial.quote}"</p>
                <div className="mt-6">
                  <div className="font-semibold text-black font-heading">{testimonial.author}</div>
                  <div className="text-gray-500">{testimonial.role}</div>
                  <div className="text-gray-500">{testimonial.institution}</div>
                </div>
              </blockquote>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
} 