import Link from 'next/link'

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl">
        <div className="relative z-10 px-6 py-16 sm:py-24 lg:py-32 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Transform Your Research Ideas into{' '}
              <span className="text-black border-b-2 border-black">Winning Grants</span>
            </h1>
            <p className="mt-6 text-xl leading-8 text-gray-600">
              Streamline your NSF & NIH grant applications with AI-powered assistance. From initial concept to final submission, 
              we help researchers craft compelling proposals with higher success rates.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="/sign-up"
                className="rounded-md bg-black px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
              >
                Get Started
              </Link>
              <Link
                href="#how-it-works"
                className="text-lg font-semibold leading-6 text-gray-900 hover:text-black"
              >
                Learn More <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* Abstract geometric pattern background */}
      <div className="absolute inset-0 -z-10 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>
    </div>
  )
} 