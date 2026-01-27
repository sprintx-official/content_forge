import HeroSection from '@/components/landing/HeroSection'
import ContentTypeGrid from '@/components/landing/ContentTypeGrid'
import FeatureShowcase from '@/components/landing/FeatureShowcase'

export default function LandingPage() {
  return (
    <div className="space-y-20 py-8">
      <HeroSection />
      <ContentTypeGrid />
      <FeatureShowcase />
    </div>
  )
}
