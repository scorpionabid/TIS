import React from 'react';
import { 
  BookOpen, 
  Settings, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Info,
  Layers,
  LayoutDashboard,
  ClipboardCheck,
  Send
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const steps = [
  {
    icon: <Settings className="h-6 w-6 text-indigo-600" />,
    title: "1. STRUKTURUN MÜƏYYƏN EDİLMƏSİ",
    description: "Planlaşdırmaya ilk növbədə 'Fənn və Vakansiyalar' tabından başlayın. Burada hər bir sinif səviyyəsi (məs. 5-ci siniflər) üzrə fənn bazasını və saat limitlərini müəyyən edin.",
    color: "bg-indigo-50",
    borderColor: "border-indigo-100"
  },
  {
    icon: <Users className="h-6 w-6 text-emerald-600" />,
    title: "2. SİNİFLƏRİN HAZIRLANMASI",
    description: "Məktəbdə olan bütün siniflərin (1A, 1B və s.) sistemdə aktiv olduğundan və düzgün səviyyədə (Class Level) olduğundan əmin olun. Şagirdlərin siniflərə paylanması bu mərhələdə yoxlanılmalıdır.",
    color: "bg-emerald-50",
    borderColor: "border-emerald-100"
  },
  {
    icon: <Layers className="h-6 w-6 text-amber-600" />,
    title: "3. SİNİF TƏDRİS PLANININ DOLDURULMASI",
    description: "'Siniflər' tabından hər bir sinfə daxil olaraq fənnləri əlavə edin. Bölünmə tələb edən fənnlərdə (məs. Xarici dil, Fiziki tərbiyə) qrup sayını və bölünmə növünü burada qeyd edin.",
    color: "bg-amber-50",
    borderColor: "border-amber-100"
  },
  {
    icon: <LayoutDashboard className="h-6 w-6 text-blue-600" />,
    title: "4. YOXLAMA (YIĞIM VƏ STATİSTİKA)",
    description: "'Yığım Cədvəli' və 'Statistika' tablarında sistem tərəfindən avtomatik hesablanmış cəmlərə baxın. 'Tayin olunmuş' ilə 'Yığım' (Real tətbiq) arasındakı fərqlərin 0 olduğundan əmin olun.",
    color: "bg-blue-50",
    borderColor: "border-blue-100"
  },
  {
    icon: <ClipboardCheck className="h-6 w-6 text-purple-600" />,
    title: "5. DƏRS BÖLGÜSÜ",
    description: "Plan hazır olduqdan sonra 'Dərs Bölgüsü' tabına keçərək fənn saatlarını konkret müəllimlərə təhkim edin. Vakansiya qaldığı halda sistem sizi xəbərdar edəcək.",
    color: "bg-purple-50",
    borderColor: "border-purple-100"
  },
  {
    icon: <Send className="h-6 w-6 text-rose-600" />,
    title: "6. TƏSDİQƏ GÖNDƏRMƏ",
    description: "Bütün məlumatlar yaşıl rənglə (uyğunluq təmin olunduqda) göründükdən sonra yuxarı sağ küncdəki 'Təsdiqə Göndər' düyməsini sıxaraq planı Sektor rəhbərliyinə göndərin.",
    color: "bg-rose-50",
    borderColor: "border-rose-100"
  }
];

export function CurriculumInstructionTab() {
  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      {/* Hero Section */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
          <BookOpen className="h-3 w-3" />
          Bələdçi
        </div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">
          Tədris Planının Doldurulması <span className="text-indigo-600">Təlimatı</span>
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto font-medium">
          Məktəb rəhbərliyi üçün tədris planının addım-addım hazırlanması və təsdiqə göndərilməsi qaydaları.
        </p>
      </div>

      <Alert className="bg-amber-50 border-amber-200 text-amber-900 rounded-3xl p-6 shadow-sm max-w-3xl mx-auto">
        <Info className="h-5 w-5 text-amber-600" />
        <AlertTitle className="text-sm font-black uppercase tracking-tight mb-2">Vacib Qeyd!</AlertTitle>
        <AlertDescription className="text-sm font-medium leading-relaxed">
          Tədris planında bütün hesablamalar avtomatlaşdırılıb. Məlumatalar 'Yığım' cədvəlinə birbaşa yazılmır, digər tablardakı təyinatlar əsasında formalaşır. Ardıcıllığa riayət etmək dəqiqliyi təmin edir.
        </AlertDescription>
      </Alert>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-8 rounded-3xl border-2 ${step.borderColor} ${step.color} shadow-sm hover:shadow-md transition-all group`}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                {step.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer Tips */}
      <div className="bg-slate-900 rounded-[40px] p-12 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <CheckCircle2 className="h-48 w-48" />
        </div>
        <div className="relative z-10 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <Info className="h-6 w-6 text-indigo-400" />
            Niyə bu ardıcıllıq vacibdir?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-xs font-medium text-slate-400 leading-relaxed">
            <div className="space-y-2">
              <p className="text-white font-bold">Düzgün Hesabatlılıq</p>
              <p>Məlumatlar birbaşa fənn bazasından gəldiyi üçün statistik hesabatlarda xəta riski minimuma enir.</p>
            </div>
            <div className="space-y-2">
              <p className="text-white font-bold">Jurnal Təminatı</p>
              <p>Hər bir təyin olunmuş fənn avtomatik olaraq elektron jurnalları formalaşdırır.</p>
            </div>
            <div className="space-y-2">
              <p className="text-white font-bold">İnteqrasiya</p>
              <p>Müəllim dərsləri və şagird davamiyyəti məhz bu plan əsasında işləyir.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
