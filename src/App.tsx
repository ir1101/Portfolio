import { useEffect } from "react";
import { CornerMarks } from "./components/CornerMarks";
import { Header } from "./components/Header";
import { initScroll } from "./lib/scroll";
import { About } from "./sections/About";
import { Capabilities } from "./sections/Capabilities";
import { Contact } from "./sections/Contact";
import { Footer } from "./sections/Footer";
import { Hero } from "./sections/Hero";
import { HeroCanvas } from "./sections/HeroCanvas";
import { Now } from "./sections/Now";
import { Work } from "./sections/Work";

export default function App() {
  useEffect(() => {
    initScroll();
  }, []);

  return (
    <>
      <Header />
      <CornerMarks />
      <HeroCanvas />
      <main id="main" tabIndex={-1}>
        <Hero />
        <About />
        <Work />
        <Capabilities />
        <Now />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
