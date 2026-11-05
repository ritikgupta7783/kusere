import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, Eye, Leaf } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { BRAND } from '../utils/images';

export default function About() {
  const { content } = useSite();
  useEffect(() => { document.title = 'About | Bimari Mitao Herbs'; }, []);

  const blocks = [
    { icon: Target, title: 'Our mission', text: content?.mission },
    { icon: Eye, title: 'Our vision', text: content?.vision },
    { icon: Leaf, title: 'Ayurvedic philosophy', text: content?.philosophy },
  ];

  return (
    <div>
      <section className="leaf-bg">
        <div className="container-page grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2">
          <div>
            <p className="eyebrow">About us</p>
            <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Healthcare rooted in Ayurveda</h1>
            <p className="mt-5 text-lg text-ink-500">{content?.aboutIntro}</p>
            <Link to="/shop" className="btn-primary mt-7">Explore Cavi-Care</Link>
          </div>
          <img src={BRAND.packBack} alt="Back of the Cavi-Care tube showing directions and ingredients" className="mx-auto max-h-[460px] w-auto rounded-3xl shadow-soft" loading="lazy" />
        </div>
      </section>

      <section className="container-page grid gap-6 py-14 sm:py-20 md:grid-cols-3">
        {blocks.map(({ icon: Icon, title, text }) => (
          <article key={title} className="card p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf-100 text-forest"><Icon /></span>
            <h2 className="mt-5 text-2xl font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">{text}</p>
          </article>
        ))}
      </section>

      <section className="container-page">
        <div className="card p-7 text-sm text-ink-500 sm:p-10">
          <h2 className="font-display text-2xl font-semibold text-ink">Made by, marketed by</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <p><strong className="text-ink">Manufactured by</strong><br />Deep Ayurveda Healthcare Pvt. Ltd., D-27, Industrial Area, Phase-1, Mohali, Punjab - 160055 (Mfg. Lic. No. 711 Ay-Pb)</p>
            <p><strong className="text-ink">Marketed by</strong><br />Bimari Mitao Herbs, Santipur, P.O. Lalmekuri, P.S. Jonai, Dist. Dhemaji, Assam - 787060</p>
          </div>
        </div>
      </section>
    </div>
  );
}
