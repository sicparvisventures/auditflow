export const CenteredHero = (props: {
  banner: React.ReactNode;
  title: React.ReactNode;
  description: string;
  buttons: React.ReactNode;
}) => (
  <div className="relative">
    {/* Decorative background elements for visual interest */}
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute -left-20 -top-20 size-64 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl md:size-96" />
      <div className="absolute -bottom-32 -right-20 size-64 rounded-full bg-gradient-to-tl from-accent/15 to-primary/15 blur-3xl md:size-96" />
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </div>

    {/* Badge/Banner with animation */}
    <div className="animate-fade-in text-center">
      {props.banner}
    </div>

    {/* Title with improved mobile typography */}
    <h1 className="mt-4 animate-fade-in text-center text-3xl font-extrabold tracking-tight sm:text-4xl md:mt-6 md:text-5xl lg:text-6xl [animation-delay:100ms]">
      {props.title}
    </h1>

    {/* Description with better mobile sizing */}
    <p className="mx-auto mt-4 max-w-screen-md animate-fade-in text-center text-base text-muted-foreground sm:text-lg md:mt-6 md:text-xl [animation-delay:200ms]">
      {props.description}
    </p>

    {/* Buttons with improved mobile layout */}
    <div className="mt-8 flex animate-fade-in flex-col justify-center gap-3 sm:flex-row sm:gap-4 md:mt-10 [animation-delay:300ms]">
      {props.buttons}
    </div>

    {/* Trust indicators for mobile */}
    <div className="mt-10 flex animate-fade-in flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground md:mt-12 [animation-delay:400ms]">
      <div className="flex items-center gap-1.5">
        <svg className="size-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>14-day free trial</span>
      </div>
      <div className="flex items-center gap-1.5">
        <svg className="size-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>No credit card</span>
      </div>
      <div className="flex items-center gap-1.5">
        <svg className="size-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Cancel anytime</span>
      </div>
    </div>
  </div>
);
