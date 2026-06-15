import { useTranslation } from 'react-i18next';
import { User, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProfileSetup } from './ProfileSetup.hooks';

export default function ProfileSetup() {
  const { t } = useTranslation('profile');
  const { input, setInput, isLoading, error, handleSubmit } = useProfileSetup();

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <User className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">{t('setup.title')}</h2>
          <p className="text-sm text-muted-foreground/70 leading-relaxed">
            {t('setup.description')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('setup.placeholder')}
            className="h-10 text-sm bg-background/60 border-border-glass text-center"
            autoFocus
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-full h-9 text-sm"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('setup.submit')}
          </Button>
        </form>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
