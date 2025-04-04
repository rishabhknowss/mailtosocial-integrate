/**
 * List of paths where navbar and sidebar should be hidden
 */
export const hideNavigationPaths = [
  '/login',
  '/signup',
  '/checkout-success'
];

/**
 * Check if navigation elements should be hidden for the current path
 * @param pathname The current path
 * @returns Boolean indicating if navigation should be hidden
 */
export const shouldHideNavigation = (pathname: string): boolean => {
  return hideNavigationPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );
}; 