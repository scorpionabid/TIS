import { 
  Info, 
  Trophy, 
  Clock, 
  AlertTriangle, 
  MinusCircle, 
  PlusCircle, 
  CheckCircle2,
  ChevronRight,
  Target,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

export function RatingCalculationInfo() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 transition-all shadow-sm"
        >
          <Info className="h-4 w-4" />
          <span className="font-semibold text-xs sm:text-sm">Hesablanma qaydası</span>
          <ChevronRight className="h-4 w-4 opacity-50" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col border-l border-blue-100">
        <SheetHeader className="p-6 bg-blue-600 text-white shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Info className="h-6 w-6 text-white" />
            </div>
            <div>
              <SheetTitle className="text-white text-xl font-bold">Məlumat Paneli</SheetTitle>
              <SheetDescription className="text-blue-100 text-xs">
                Reytinq və Statistika Hesablanma Metodologiyası
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8 pb-12">
            {/* General Formula Section */}
            <section>
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                Ümumi Hesablanma Düsturu
              </h3>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-center shadow-sm">
                <div className="text-xs text-blue-600 font-medium mb-3 uppercase tracking-wider">Yekun Reytinq Balı</div>
                <div className="text-sm sm:text-base font-mono bg-white p-3 rounded-lg border border-blue-200 shadow-inner inline-block">
                  <span className="text-emerald-700 font-bold">1.0 (Baza)</span> + 
                  <span className="text-blue-700 font-bold"> Bonus</span> - 
                  <span className="text-amber-700 font-bold"> (Penalti)</span>
                </div>
                <p className="text-[11px] text-blue-500/70 mt-3 italic">
                  *Cərimələr keyfiyyət və gecikmə faktorlarına əsaslanır
                </p>
              </div>
            </section>

            {/* Components Grid */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Bal Komponentləri
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Base Score */}
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-emerald-800 text-sm">Baza Bal</div>
                      <div className="text-emerald-600 font-black text-lg">+1.0</div>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Sətirlərin doldurulub təqdim edilməsi və ya inzibati təsdiq prosesi başlandığı andan verilən başlanğıc balıdır.
                    </p>
                  </CardContent>
                </Card>

                {/* Bonus Score */}
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-blue-800 text-sm">Operativlik Bonusu</div>
                      <div className="text-blue-600 font-black text-lg">+1.0</div>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Hesabat dərc olunduqdan sonra ilk <b>4 iş saatı</b> (saat 09:00 - 18:00 arası) ərzində tamamlanarsa verilir.
                    </p>
                  </CardContent>
                </Card>

                {/* Overdue Penalty */}
                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-amber-800 text-sm">Gecikmə Cəriməsi</div>
                      <div className="text-amber-600 font-black text-lg">-0.1 <span className="text-[10px] font-normal">/gün</span></div>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Son tarixdən keçən hər 24 saatlıq dövr üçün tətbiq olunur. Maksimum 1.0 xal azaldıla bilər.
                    </p>
                  </CardContent>
                </Card>

                {/* Quality Penalty */}
                <Card className="border-l-4 border-l-red-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-red-800 text-sm">Keyfiyyət Cəriməsi</div>
                      <div className="text-red-600 font-bold text-sm">Mütənasib</div>
                    </div>
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between text-[11px] p-2 bg-red-50 rounded border border-red-100">
                        <span className="text-red-700">Hər geri qaytarılmış sətir (%)</span>
                        <span className="font-bold text-red-800">-0.15 xal</span>
                      </div>
                      <div className="flex justify-between text-[11px] p-2 bg-red-50 rounded border border-red-100">
                        <span className="text-red-700">Hər rədd edilmiş sətir (%)</span>
                        <span className="font-bold text-red-800">-0.30 xal</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Special Conditions */}
            <section className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Əlavə Qeydlər</h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <Clock className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="text-[11px] text-gray-600 leading-relaxed">
                    <b className="text-gray-900">Həftəsonu Şərti:</b> Həftəsonu dərc olunan hesabatlarda vaxt hesabı növbəti bazar ertəsi saat 09:00-dan etibarən sayılır.
                  </div>
                </li>
                <li className="flex gap-3">
                  <BarChart3 className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="text-[11px] text-gray-600 leading-relaxed">
                    <b className="text-gray-900">Ağıllı Sinxronizasiya:</b> Bütün sətirlər təsdiqləndikdə, cədvəl avtomatik olaraq "Göndərildi" statusuna keçir və bal dərhal yekunlaşır.
                  </div>
                </li>
                <li className="flex gap-3">
                  <BarChart3 className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="text-[11px] text-gray-600 leading-relaxed">
                    <b className="text-gray-900">Faiz vs Reytinq:</b> Ortalama keyfiyyət faizi yalnız sətirlərin təsdiq nisbətidir. Reytinq balı isə sürət və intizamı (gecikmə və rədlər) daxil olmaqla bütün faktorları nəzərə alır.
                  </div>
                </li>
              </ul>
            </section>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 text-center italic">
                Bu məlumatlar məktəblərin fəaliyyətinin şəffaf qiymətləndirilməsi üçün nəzərdə tutulub.
              </p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
