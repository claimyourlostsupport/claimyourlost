/** Listing / stored photo display size (px). Keep in sync with server `IMAGE_MAX_EDGE` (default 60). */
export const LISTING_IMAGE_SIZE = 60;

export const listingImgClass =
  'w-[60px] h-[60px] max-w-full max-h-full object-contain shrink-0 rounded-lg bg-slate-100';

/** Card / detail frame around listing image */
export const listingImageFrameClass = 'flex min-h-[60px] items-center justify-center bg-slate-100 py-2';

/** Empty placeholder box when no image */
export const listingImagePlaceholderClass =
  'flex h-[60px] w-[60px] items-center justify-center text-lg opacity-40';

/** Fixed box for list rows (dashboard, etc.) */
export const listingImageThumbBoxClass =
  'flex h-[60px] w-[60px] items-center justify-center rounded-xl bg-slate-100 overflow-hidden shrink-0';
