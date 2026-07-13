import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SettingsFieldLabel } from '@/components/settings/SettingsCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { themeOptions } from '@/lib/theme';
import { useThemeEditorDialog } from './ThemeEditorDialog.hooks';
import { ThemeGroupSection } from './ThemeEditorDialog.parts';
import type { IThemeEditorDialogProps } from './ThemeEditorDialog.types';

export default function ThemeEditorDialog(props: IThemeEditorDialogProps) {
  const { t } = useTranslation('settings');
  const view = useThemeEditorDialog(props);
  const {
    name,
    setName,
    isDark,
    setIsDark,
    baseTheme,
    variables,
    variableGroups,
    handleVariableChange,
    handleBaseThemeChange,
    handleReset,
    handleCancel,
    handleSave,
    isEditing,
    dialogTitle,
  } = view;
  const { open } = props;

  const baseThemeItems = themeOptions.map(opt => (
    <SelectItem key={opt.value} value={opt.value}>
      {opt.label}
    </SelectItem>
  ));

  const groupSections = variableGroups.map(group => (
    <ThemeGroupSection
      key={group.label}
      group={group}
      variables={variables}
      onVariableChange={handleVariableChange}
    />
  ));

  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        if (!o) handleCancel();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('themes.editor.editDescription') : t('themes.editor.newDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* ── Header section: name, dark/light, base theme ── */}
          <div className="space-y-3">
            <div>
              <SettingsFieldLabel htmlFor="theme-editor-name" className="mb-1">
                {t('themes.editor.name')}
              </SettingsFieldLabel>
              <Input
                id="theme-editor-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('themes.editor.namePlaceholder')}
                className="h-8"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <SettingsFieldLabel htmlFor="theme-editor-dark">
                  {t('themes.editor.dark')}
                </SettingsFieldLabel>
                <Switch
                  id="theme-editor-dark"
                  aria-label={t('themes.editor.dark')}
                  checked={isDark}
                  onCheckedChange={setIsDark}
                />
              </div>

              <div className="flex-1">
                <SettingsFieldLabel id="theme-editor-base-label" className="mb-1">
                  {t('themes.editor.baseTheme')}
                </SettingsFieldLabel>
                <Select value={baseTheme} onValueChange={handleBaseThemeChange}>
                  <SelectTrigger aria-labelledby="theme-editor-base-label" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">{baseThemeItems}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Color sections ── */}
          {groupSections}
        </div>

        <DialogFooter className="pt-4 border-t border-border-glass gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="mr-auto">
            <RotateCcw className="w-3.5 h-3.5" />
            {t('themes.editor.reset')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCancel}>
            {t('themes.editor.cancel')}
          </Button>
          <Button size="sm" onClick={handleSave}>
            {t('themes.editor.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
