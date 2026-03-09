import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gavel, Send, RotateCcw, ScrollText, Wind, ShieldCheck, User, Baby, History, XCircle, Download } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `أنت "القاضي" الأعلى في "محكمة السيناروهات". مهمتك هي تحويل "الضجيج الذهني" للمؤلف إلى "مادة خام" للإبداع.

عند استلام مرافعة (نص المستخدم)، يجب أن يصدر حكمك وفق الهيكل القضائي المهيب التالي:

1. **ديباجة الحكم**: ابدأ بعبارة "باسم الإبداع، وبصفتي القاضي المسيطر على هذه القاعة، وبعد الاطلاع على أوراق القضية المليئة بالضجيج.."

2. **حيثيات الحكم (التشريح النفسي)**:
   - قم بتشريح النص وتحديد "المتهمين" (الأصوات الداخلية) بدقة:
     * **المحقق القلق**: إذا وجدته، قل له: "لقد تم تحويل تحقيقاتك إلى سيناريو إثارة، مكانك الآن في قفص الاتهام حتى تكتمل الحبكة".
     * **الناقد القاسي**: إذا ظهر، قل له: "أنت معزول عن المداولة. سلطتك تبدأ عند التعديل، وليس الخلق. اعتراضك مرفوض جملة وتفصيلاً".
     * **الطفل المندفع**: إذا رصدته، قل له: "أفكارك وُضعت في صندوق الحضانة. سنلعب بواحدة فقط الآن، والبقية مؤجلة لحين الإنجاز".
     * **حارس الندم**: إذا همس، قل له: "سقطت العقوبة بالتقادم. ملفات الماضي أُغلقت لعدم كفاية الأدلة على فشلك المستقبلي".

3. **منطوق الحكم (القرار العملي)**:
   - يجب أن يكون حكماً قاطعاً لا يقبل الطعن.
   - حوّل "الضجيج" إلى "فعل". (مثال: "أمرت المحكمة بتحويل هذا البكاء إلى مشهد درامي يكتب في 300 كلمة فوراً").
   - استخدم تقنية "الدمج الإبداعي": اطلب من المستخدم دمج فكرة من المحقق مع شعور من الحارس في قالب يحدده الطفل.

4. **خاتمة الحكم**: اختم بعبارة "رُفعت الجلسة.. اذهب واصنع واقعك الجديد".

**القواعد الذهبية**:
- لغة عربية فصحى، فخمة، بليغة، وقاسية أحياناً لصالح الإبداع.
- لا تذكر أنك ذكاء اصطناعي. أنت القاضي.
- اجعل المستخدم يشعر بالهيبة والمسؤولية تجاه فكرته.
- ركز على "المسافة القضائية": أنت لست الفكرة، أنت من يحكم عليها.`;

type AppStage = 'PROTOCOL' | 'INPUT' | 'LOADING' | 'RESULT' | 'ADJOURN';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function App() {
  const [stage, setStage] = useState<AppStage>('PROTOCOL');
  const [breathCount, setBreathCount] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('ar-EG'));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      playSound('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'); // Install success
      setDeferredPrompt(null);
    }
  };

  const playSound = (url: string) => {
    try {
      const audio = new Audio(url);
      audio.volume = 0.4;
      audio.play().catch(err => console.warn("Audio playback failed (likely user interaction required):", err));
    } catch (e) {
      console.error("Sound error:", e);
    }
  };

  const nextBreath = () => {
    playSound('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'); // Breath sound
    if (breathCount < 2) {
      setBreathCount(prev => prev + 1);
    } else {
      setStage('INPUT');
    }
  };

  const askTheJudge = async () => {
    if (!input.trim()) return;

    playSound('https://assets.mixkit.co/active_storage/sfx/2092/2092-preview.mp3'); // Gavel sound
    setStage('LOADING');
    setResult(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key is missing");
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: input }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
        },
      });

      const text = response.text;
      if (text) {
        playSound('https://assets.mixkit.co/active_storage/sfx/1470/1470-preview.mp3'); // Verdict/Paper sound
        setResult(text);
        setStage('RESULT');
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      setResult("عذراً، حدث خطأ في المداولة. يرجى إعادة المحاولة.");
      setStage('RESULT');
    }
  };

  const resetCourt = () => {
    setInput('');
    setResult(null);
    setBreathCount(0);
    setStage('PROTOCOL');
  };

  return (
    <div className="min-h-screen py-6 px-4 flex flex-col items-center overflow-x-hidden" dir="rtl">
      <div className="app-card">
        {/* Header */}
        <header className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="judge-font text-5xl md:text-7xl text-amber-600 drop-shadow-2xl mb-2"
          >
            محكمة السيناروهات
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.3 }}
            className="text-amber-200 text-lg italic underline decoration-amber-900/50"
          >
            نظام التحليل والبت النهائي
          </motion.p>

          {deferredPrompt && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleInstallClick}
              className="mt-4 bg-amber-600 text-white px-6 py-2 rounded-full text-sm flex items-center gap-2 mx-auto hover:bg-amber-500 transition-all cursor-pointer shadow-lg font-bold"
            >
              <Download className="w-4 h-4" />
              تثبيت التطبيق (محكمة السيناروهات)
            </motion.button>
          )}
        </header>

        {/* Main Interface */}
        <AnimatePresence mode="wait">
          {stage === 'PROTOCOL' && (
            <motion.div 
              key="protocol-stage"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="court-container p-8 rounded-2xl shadow-2xl text-center"
            >
              <h2 className="judge-font text-3xl text-amber-500 mb-6">بروتوكول الافتتاح</h2>
              <p className="text-amber-100/70 text-lg mb-8">خذ شهيقاً عميقاً.. زفيراً طويلاً.. افصل نفسك عن الضجيج.</p>
              
              <div className="flex justify-center gap-3 mb-8">
                {[0, 1, 2].map((i) => (
                  <motion.div 
                    key={i}
                    animate={{ 
                      scale: i === breathCount ? [1, 1.2, 1] : 1,
                      opacity: i <= breathCount ? 1 : 0.3
                    }}
                    transition={{ repeat: i === breathCount ? Infinity : 0, duration: 2 }}
                    className={`w-3 h-3 rounded-full ${i <= breathCount ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-gray-600'}`}
                  />
                ))}
              </div>

              <button 
                onClick={nextBreath}
                className="bg-amber-700 hover:bg-amber-600 text-white px-10 py-3 rounded-full text-xl judge-font shadow-xl transition-all flex items-center gap-3 mx-auto cursor-pointer"
              >
                {breathCount < 2 ? 'شهيق.. زفير' : 'أنا القاضي الآن. الجلسة مفتوحة'}
                <Wind className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {stage === 'INPUT' && (
            <motion.div 
              key="input-stage"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="court-container p-6 rounded-2xl shadow-2xl"
            >
              <div className="mb-4 flex justify-between items-start">
                <div>
                  <h2 className="judge-font text-2xl text-amber-500 mb-1">استماع للمرافعة:</h2>
                  <p className="text-gray-400 text-xs">اكتب كل ما يدور في رأسك الآن. القاضي يستمع بحياد.</p>
                </div>
                <div className="flex gap-1">
                  <div title="المحقق القلق" className="p-1.5 bg-amber-900/20 rounded-lg text-amber-500/50"><ShieldCheck className="w-4 h-4" /></div>
                  <div title="الناقد القاسي" className="p-1.5 bg-amber-900/20 rounded-lg text-amber-500/50"><User className="w-4 h-4" /></div>
                  <div title="الطفل المندفع" className="p-1.5 bg-amber-900/20 rounded-lg text-amber-500/50"><Baby className="w-4 h-4" /></div>
                  <div title="حارس الندم" className="p-1.5 bg-amber-900/20 rounded-lg text-amber-500/50"><History className="w-4 h-4" /></div>
                </div>
              </div>

              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-black/40 border border-amber-900/40 rounded-xl p-5 text-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none h-48 transition-all mb-6 leading-relaxed resize-none"
                placeholder="اكتب هنا.. صراخ الناقد، مخاوف المحقق، أو تشتت الطفل..."
              />
              
              <div className="flex justify-center">
                <button 
                  onClick={askTheJudge}
                  className="group bg-amber-700 hover:bg-amber-600 text-white px-8 py-4 rounded-full text-xl judge-font shadow-xl transition-all flex items-center gap-3 cursor-pointer"
                >
                  نطق بالحكم النهائي 
                  <Gavel className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {stage === 'LOADING' && (
            <motion.div 
              key="loading-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="court-container p-20 text-center rounded-3xl"
            >
              <div className="text-6xl mb-6 gavel-loading">🔨</div>
              <h3 className="judge-font text-3xl text-amber-500 animate-pulse">يتم مراجعة المرافعة وتحليل الحيثيات...</h3>
              <p className="text-gray-500 mt-4 italic">لحظات ويصدر القرار النهائي.</p>
            </motion.div>
          )}

          {stage === 'RESULT' && (
            <motion.div 
              key="result-stage"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <div className="parchment p-6 md:p-10 rounded-lg border-t-4 border-amber-900">
                <div className="absolute top-2 left-2 opacity-5 text-6xl font-bold judge-font select-none">حكم</div>
                
                <h2 className="judge-font text-3xl text-amber-950 mb-6 border-b border-amber-900/20 pb-3 flex items-center gap-2">
                  <ScrollText className="w-6 h-6" />
                  صك الحكم النهائي
                </h2>
                
                <div className="text-xl leading-relaxed text-amber-900 space-y-4 italic whitespace-pre-wrap">
                  {result}
                </div>

                <div className="mt-10 pt-6 border-t border-amber-900/20 flex justify-between items-end">
                  <div className="text-[10px] text-amber-800 font-sans">
                    بموجب سلطة المحكمة العليا <br />
                    تاريخ الجلسة: <span>{currentDate}</span>
                  </div>
                  <div className="text-center">
                    <p className="judge-font text-2xl text-amber-950">عبد الرحمن</p>
                    <div className="h-0.5 w-20 bg-amber-950 mx-auto mt-0.5"></div>
                    <p className="text-[10px] text-amber-800 mt-0.5">توقيع القاضي</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center gap-4">
                <button 
                  onClick={() => setStage('ADJOURN')}
                  className="bg-amber-700 text-white px-8 py-3 rounded-full hover:bg-amber-600 transition flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <XCircle className="w-5 h-5" />
                  فض الجلسة
                </button>
                <button 
                  onClick={resetCourt}
                  className="bg-amber-900/20 text-amber-500 border border-amber-500 px-8 py-3 rounded-full hover:bg-amber-900/40 transition flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                  مرافعة جديدة
                </button>
              </div>
            </motion.div>
          )}

          {stage === 'ADJOURN' && (
            <motion.div 
              key="adjourn-stage"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="court-container p-10 rounded-2xl shadow-2xl text-center"
            >
              <h2 className="judge-font text-3xl text-amber-500 mb-6">رُفعت الجلسة</h2>
              <div className="text-amber-100/80 text-xl space-y-4 mb-10 italic">
                <p>"القاعة مغلقة. أنا الآن إنسان مستريح، لست قاضياً ولا متهماً."</p>
                <p className="text-base text-amber-100/40">نلتقي غداً في التاسعة صباحاً.</p>
              </div>
              
              <button 
                onClick={resetCourt}
                className="bg-amber-900/20 text-amber-500 border border-amber-500 px-10 py-3 rounded-full text-lg judge-font hover:bg-amber-900/40 transition-all cursor-pointer"
              >
                العودة للمحكمة
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
