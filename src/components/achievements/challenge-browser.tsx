"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChallengeTemplateCard } from './challenge-template-card';
import { 
  CHALLENGE_TEMPLATES, 
  getTemplatesByDifficulty,
  getRecommendedChallenges,
  type ChallengeTemplate 
} from '@/lib/challenge-templates';
import { Sparkles, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChallengeBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userLevel?: number;
  activeChallengeIds?: string[];
  onAcceptChallenge: (template: ChallengeTemplate) => Promise<void>;
}

export function ChallengeBrowser({
  open,
  onOpenChange,
  userLevel = 1,
  activeChallengeIds = [],
  onAcceptChallenge,
}: ChallengeBrowserProps) {
  const [accepting, setAccepting] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const handleAccept = async (template: ChallengeTemplate) => {
    setAccepting(template.id);
    try {
      await onAcceptChallenge(template);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao aceitar desafio:', error);
    } finally {
      setAccepting(null);
    }
  };

  const getFilteredTemplates = () => {
    if (filter === 'all') return CHALLENGE_TEMPLATES;
    return getTemplatesByDifficulty(filter.toUpperCase());
  };

  const recommended = getRecommendedChallenges(userLevel);
  const filteredTemplates = getFilteredTemplates();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle className="text-2xl">Explorar Desafios</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Escolha um desafio e comece sua jornada financeira
          </p>
        </DialogHeader>

        <Tabs defaultValue="recommended" className="flex-1">
          <div className="border-b px-6">
            <TabsList className="h-auto space-x-1 bg-transparent p-0">
              <TabsTrigger 
                value="recommended" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Recomendados
              </TabsTrigger>
              <TabsTrigger 
                value="all"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Todos ({CHALLENGE_TEMPLATES.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 180px)' }}>
            {/* Recommended Tab */}
            <TabsContent value="recommended" className="mt-0 space-y-6">
              <div className="rounded-lg bg-primary/5 p-4">
                <h3 className="font-semibold">Desafios para seu nível ({userLevel})</h3>
                <p className="text-sm text-muted-foreground">
                  Selecionamos desafios ideais baseados no seu progresso
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {recommended.map((template) => (
                  <ChallengeTemplateCard
                    key={template.id}
                    template={template}
                    onAccept={handleAccept}
                    disabled={accepting === template.id || activeChallengeIds.includes(template.id)}
                  />
                ))}
              </div>
            </TabsContent>

            {/* All Tab */}
            <TabsContent value="all" className="mt-0 space-y-6">
              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtrar por dificuldade:</span>
                <div className="flex gap-2">
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'easy', label: 'Fácil' },
                    { value: 'medium', label: 'Médio' },
                    { value: 'hard', label: 'Difícil' },
                    { value: 'expert', label: 'Expert' },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={filter === option.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Templates Grid */}
              <motion.div 
                className="grid gap-4 md:grid-cols-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={filter}
              >
                {filteredTemplates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ChallengeTemplateCard
                      template={template}
                      onAccept={handleAccept}
                      disabled={accepting === template.id || activeChallengeIds.includes(template.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {filteredTemplates.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  Nenhum desafio encontrado com este filtro
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
