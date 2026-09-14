'use client'

import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { AuthShell } from '@/components/customer/auth-shell'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'

export default function VerifyEmailPage() {
  const { t } = useLanguage()
  return (
    <AuthShell tagline={t('auth.registerSubtitle')}>
      <div className="mx-auto w-full max-w-sm text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
          <MailCheck size={24} aria-hidden="true" />
        </span>
        <h1 className="mt-3 text-h1 font-extrabold text-foreground">{t('auth.verifyTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('auth.verifyMessage')}</p>
        <Button asChild fullWidth size="lg" className="mt-6">
          <Link href="/login">{t('auth.goToLogin')}</Link>
        </Button>
      </div>
    </AuthShell>
  )
}
