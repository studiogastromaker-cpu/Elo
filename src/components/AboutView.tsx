import React from 'react';
import { ShieldCheck, Heart, UserSearch, AlertCircle } from 'lucide-react';

const AboutView: React.FC = () => {
  return (
    <div className="p-6 h-full space-y-8 overflow-y-auto">
      <div className="text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Heart size={32} fill="currentColor" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Sobre o Elo</h2>
        <p className="text-sm text-slate-500 mt-2">Versão 1.0 • Feito com cuidado para o seu bem-estar.</p>
      </div>

      <div className="grid gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex gap-4">
          <div className="p-3 bg-rose-50 text-rose-500 rounded-xl h-fit">
            <Heart size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-1">Filosofia de Sabedoria</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              As diretrizes e conselhos do Elo são inspirados na sabedoria milenar clássica e em princípios bíblicos universais de paciência, compaixão, amor, autodomínio e esperança, transmitidos de forma natural, moderna e acolhedora para o seu dia a dia.
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex gap-4">
          <div className="p-3 bg-blue-50 text-blue-500 rounded-xl h-fit">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-1">Seu Espaço Seguro</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              O Elo foi criado para ser um refúgio digital. Não julgamos, apenas ouvimos e oferecemos suporte emocional leve através de inteligência artificial.
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex gap-4">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-xl h-fit">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-1">Nota Importante</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Este aplicativo é uma ferramenta de apoio e não substitui aconselhamento médico ou psicológico profissional. Em situações graves, procure ajuda especializada.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
        <div className="flex items-center gap-2 mb-4">
          <UserSearch size={20} className="text-rose-500" />
          <h3 className="font-bold text-rose-900">Precisa de Ajuda Agora?</h3>
        </div>
        <div className="space-y-4">
          <div className="bg-white/80 p-4 rounded-xl">
            <p className="text-sm font-bold text-slate-800 mb-1">CVV - Centro de Valorização da Vida</p>
            <p className="text-xs text-slate-600 mb-2">Atendimento gratuito e sigiloso 24 horas por dia.</p>
            <a href="tel:188" className="inline-block px-4 py-2 bg-rose-500 text-white text-xs font-bold rounded-lg shadow-sm">Ligue 188</a>
          </div>
          <div className="bg-white/80 p-4 rounded-xl">
            <p className="text-sm font-bold text-slate-800 mb-1">Busque Ajuda Profissional</p>
            <p className="text-xs text-slate-600">Psicólogos e terapeutas são os profissionais indicados para acompanhamento de saúde mental profundo.</p>
          </div>
        </div>
      </div>

      <div className="text-center pt-8 pb-4">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Respire fundo. Você não está só.</p>
      </div>
    </div>
  );
};

export default AboutView;
