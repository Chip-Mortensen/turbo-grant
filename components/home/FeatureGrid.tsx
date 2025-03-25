'use client';

import { Lightbulb, ClipboardCheck, Users } from 'lucide-react'
import { motion } from 'framer-motion';

const features = [
  {
    name: 'Ideation to Application',
    description: 'Transform your research concepts into polished funding applications with our structured process and AI assistance.',
    icon: Lightbulb,
  },
  {
    name: 'Smart Funding Match',
    description: 'Find the perfect funding opportunities through intelligent matching, advanced filters, and the ability to directly chat with grant details.',
    icon: ClipboardCheck,
  },
  {
    name: 'AI Writing Assistant',
    description: 'Create compelling application documents with our AI copilot that helps draft, refine, and enhance your funding proposals.',
    icon: Users,
  },
]

export default function FeatureGrid() {
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
          <h2 className="text-base font-semibold leading-7 text-gray-600">Accelerate Your Success</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to secure research funding
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-500">
            Our platform simplifies the grant application process, letting you focus on what matters most - your groundbreaking research.
          </p>
        </motion.div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="flex flex-col"
              >
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <feature.icon className="h-5 w-5 flex-none text-gray-900" aria-hidden="true" />
                  <span className="font-heading">{feature.name}</span>
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-500">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
} 