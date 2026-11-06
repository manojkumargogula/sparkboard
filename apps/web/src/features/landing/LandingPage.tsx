import { IdeaSheet } from "../idea/IdeaSheet";
import { AllIdeas } from "./AllIdeas";
import { CtaBand } from "./CtaBand";
import { Hero } from "./Hero";
import { Stickers } from "./Stickers";
import { TagMarquee } from "./TagMarquee";
import { TopTen } from "./TopTen";

export function LandingPage() {
  return (
    <>
      <Hero />
      <TagMarquee />
      <Stickers />
      <TopTen />
      <AllIdeas />
      <CtaBand />
      <IdeaSheet basePath="/" />
    </>
  );
}
