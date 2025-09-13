import heroImage from "@/assets/flora-hero.jpg";

const HeroBackground = () => (
  <div className="absolute inset-0 z-0">
    <img
      src={heroImage}
      alt="Beautiful houseplants in modern pots"
  className="w-full h-full object-cover object-right-bottom opacity-30"
    />
    <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/80" />
  </div>
);

export default HeroBackground;
