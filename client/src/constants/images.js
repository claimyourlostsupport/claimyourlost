/** Listing / stored photo display size (px). Keep in sync with server `IMAGE_MAX_EDGE` (default 30). */
export const LISTING_IMAGE_SIZE = 30;

export const listingImgClass =
  'w-[30px] h-[30px] max-w-full max-h-full object-cover shrink-0 rounded-lg';

/** Card / detail frame around listing image */
export const listingImageFrameClass = 'flex min-h-[30px] items-center justify-center bg-slate-100 py-2';

/** Empty placeholder box when no image */
export const listingImagePlaceholderClass =
  'flex h-[30px] w-[30px] items-center justify-center text-lg opacity-40';

/** Fixed box for list rows (dashboard, etc.) */
export const listingImageThumbBoxClass =
  'flex h-[30px] w-[30px] items-center justify-center rounded-xl bg-slate-100 overflow-hidden shrink-0';
