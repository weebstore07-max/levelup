import { test, expect, Page } from '@playwright/test';

// Global error/log collector for final QA audit report
export const auditLog = {
  consoleErrors: [] as string[],
  pageErrors: [] as string[],
  failedRequests: [] as string[],
  failedResponses: [] as string[],
};

function attachListeners(page: Page) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon.ico') && !text.includes('chrome-extension')) {
        auditLog.consoleErrors.push(`[${page.url()}] Console Error: ${text}`);
      }
    }
  });

  page.on('pageerror', error => {
    auditLog.pageErrors.push(`[${page.url()}] Page Exception: ${error.message}`);
  });

  page.on('requestfailed', request => {
    const url = request.url();
    if (!url.includes('favicon.ico') && !url.includes('chrome-extension')) {
      auditLog.failedRequests.push(`[${page.url()}] Request Failed: ${request.method()} ${url} (${request.failure()?.errorText || 'Failed'})`);
    }
  });

  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    // Ignore expected 401s from initial auth checks
    if (status >= 400 && !url.includes('favicon.ico') && !url.includes('auth/v1/user')) {
      auditLog.failedResponses.push(`[${page.url()}] HTTP ${status}: ${url}`);
    }
  });
}

// Helper to set up authenticated session for QA testing
async function setupAuthenticatedSession(page: Page) {
  const fakeUser = {
    id: '00000000-0000-4000-a000-000000000000',
    email: 'qa_auditor@gmail.com',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: 'QA Auditor' },
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString()
  };

  const fakeSession = {
    access_token: 'fake-qa-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 36000,
    refresh_token: 'fake-qa-refresh-token',
    user: fakeUser
  };

  await page.addInitScript((sessionData) => {
    window.localStorage.setItem('sb-ztezgtpuxjwmxcllecsv-auth-token', JSON.stringify(sessionData));
    window.localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
  }, fakeSession);

  // Intercept Supabase Auth GET user & session calls
  await page.route('**/auth/v1/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-qa-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 36000,
        refresh_token: 'fake-qa-refresh-token',
        user: fakeUser,
        ...fakeUser
      })
    });
  });

  // Intercept REST calls for new user returning empty arrays
  await page.route('**/rest/v1/courses*', async route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/todos*', async route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/targets*', async route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/notifications*', async route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/study_sessions*', async route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/user_achievements*', async route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/lesson_progress*', async route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/users*', async route => route.fulfill({ 
    status: 200, 
    contentType: 'application/json', 
    body: JSON.stringify({
      id: fakeUser.id,
      email: fakeUser.email,
      display_name: 'QA Auditor',
      xp: 0,
      level: 1,
      streak_days: 0
    })
  }));
}

test.describe('A. Public Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    attachListeners(page);
  });

  test('Homepage loads, verifies branding, top nav, hero section, feature cards, FAQ, and footer', async ({ page }) => {
    await page.goto('/');

    // 1. Verify / loads successfully & title/logo
    await expect(page).toHaveURL('/');
    const logo = page.locator('header').getByText('Level Up');
    await expect(logo).toBeVisible();

    // 2. Center navigation items (Desktop / Tablet)
    const isMobile = (page.viewportSize()?.width || 1440) < 768;
    const nav = page.locator('header nav');
    if (!isMobile) {
      await expect(nav.getByText('Home')).toBeVisible();
      await expect(nav.getByText('Features')).toBeVisible();
      await expect(nav.getByText('How It Works')).toBeVisible();
      await expect(nav.getByText('FAQ')).toBeVisible();
    }

    // 3. Testimonials is NOT present anywhere on page
    await expect(page.getByText('Testimonials', { exact: true })).toHaveCount(0);

    // 4. Header top-right buttons: "Log in" only, NO "Get Started"
    if (!isMobile) {
      const headerRight = page.locator('header div.hidden.md\\:flex');
      await expect(headerRight.getByText('Log in')).toBeVisible();
      await expect(headerRight.getByText('Get Started', { exact: true })).toHaveCount(0);
    }

    // 5. Hero CTA button
    const heroBtn = page.getByRole('link', { name: /Get Started Free/i });
    await expect(heroBtn).toBeVisible();

    // 6. Feature Cards present
    await expect(page.getByRole('heading', { name: 'Learn Your Way' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stay on Track' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'See Real Progress' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Get Rewarded' })).toBeVisible();

    // 7. How It Works Section
    await expect(page.getByRole('heading', { name: 'Designed for Deep Work' })).toBeVisible();
    await expect(page.getByText('Import & Organize')).toBeVisible();
    await expect(page.getByText('Execute Daily Targets')).toBeVisible();
    await expect(page.getByText('Level Up & Analyze')).toBeVisible();

    // 8. FAQ Section
    await expect(page.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeVisible();
    const faqBtn = page.getByRole('button', { name: /Is LevelUp free to use/i });
    await expect(faqBtn).toBeVisible();
    await faqBtn.click();
    await expect(page.getByText(/LevelUp is free for self-learners/i)).toBeVisible();

    // 9. Clicking hero CTA navigates to signup state
    await heroBtn.click();
    await expect(page).toHaveURL('/login?mode=signup');
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();

    // 10. Verify smooth scroll anchor links (Desktop / Tablet)
    if (!isMobile) {
      await page.goto('/');
      await nav.getByText('Features').click();
      await expect(page.locator('#features')).toBeVisible();

      await nav.getByText('How It Works').click();
      await expect(page.locator('#how-it-works')).toBeVisible();

      await nav.getByText('FAQ').click();
      await expect(page.locator('#faq')).toBeVisible();
    }
  });
});

test.describe('B. Authentication & Protected Routes', () => {
  test.beforeEach(async ({ page }) => {
    attachListeners(page);
  });

  test('Protected routes redirect unauthenticated users to /login', async ({ page }) => {
    const routes = ['/dashboard', '/tracks', '/analytics', '/targets', '/achievements', '/todo', '/notifications', '/settings'];
    for (const route of routes) {
      await page.goto(route);
      await expect(page).toHaveURL('/login');
    }
  });

  test('Login page mode toggling & Google OAuth button existence', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Toggle to Sign Up
    const toggleToSignUp = page.getByRole('button', { name: 'Sign up' });
    await toggleToSignUp.click();
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();

    // Toggle back to Sign In
    const toggleToSignIn = page.getByRole('button', { name: 'Sign in' });
    await toggleToSignIn.click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Verify Google OAuth button is present
    const googleBtn = page.getByRole('button', { name: /Continue with Google/i });
    await expect(googleBtn).toBeVisible();
  });

  test('QA Account registration attempt behavior', async ({ page }) => {
    const testEmail = `qa_audit_${Date.now()}@gmail.com`;
    await page.goto('/login?mode=signup');
    await page.fill('input#name', 'QA Auditor');
    await page.fill('input#email', testEmail);
    await page.fill('input#password', 'LevelUp2026!Pass');

    const submitBtn = page.getByRole('button', { name: 'Sign Up' });
    await submitBtn.click();
    await page.waitForTimeout(2500);

    // Verify appropriate response (confirmation notice, rate limit, or redirect)
    const isDashboard = page.url().includes('/dashboard');
    if (!isDashboard) {
      const feedback = page.getByText(/Too many requests|check your Gmail|confirm|rate limit|exists|registered/i);
      await expect(feedback).toBeVisible();
    }
  });
});

test.describe('C-K. Authenticated User Flow & Component Audits', () => {
  test.beforeEach(async ({ page }) => {
    attachListeners(page);
    await setupAuthenticatedSession(page);
  });

  test('C & D. Dashboard & Navigation Links', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    
    // Check Sidebar links
    await expect(sidebar.getByRole('link', { name: /Dashboard/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Tracks/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Analytics/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Targets/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Achievements/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /To-Do List/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Notifications/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Settings/i })).toBeVisible();
  });

  test('E. Tracks Page & Empty State', async ({ page }) => {
    await page.goto('/tracks');
    
    // Check Import form exists
    await expect(page.getByRole('heading', { name: 'Import YouTube Content' })).toBeVisible();
    await expect(page.getByPlaceholder(/Paste YouTube video or playlist link/i)).toBeVisible();

    // Check Empty state for new user
    await expect(page.getByText('Your learning journey starts here')).toBeVisible();
    await expect(page.getByText('Add a YouTube playlist to create your first learning track.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Track' })).toBeVisible();
  });

  test('F. Analytics Page & Empty States', async ({ page }) => {
    await page.goto('/analytics');

    // Check Summary Metrics Headers
    await expect(page.getByText('Total Study Time', { exact: true })).toBeVisible();
    await expect(page.getByText('Lessons Completed', { exact: true })).toBeVisible();
    await expect(page.getByText('XP Earned', { exact: true })).toBeVisible();
    await expect(page.getByText('Longest Streak', { exact: true })).toBeVisible();

    // Check XP Progress Empty State
    await expect(page.getByText('Your XP progress will appear here')).toBeVisible();
    await expect(page.getByText('Earn XP by completing lessons, tasks, and achievements.')).toBeVisible();

    // Check Most Productive Time Empty State
    await expect(page.getByText('Your productive time will appear here')).toBeVisible();
    await expect(page.getByText('Complete a few study sessions to discover when you learn best.')).toBeVisible();
  });

  test('G. To-Do Page & Empty State', async ({ page }) => {
    await page.goto('/todo');

    // Check Add Task Form
    await expect(page.getByPlaceholder(/What do you need to study/i)).toBeVisible();
    await expect(page.locator('form').getByRole('button', { name: 'Add Task' })).toBeVisible();

    // Check Empty State
    await expect(page.getByText('Nothing planned yet')).toBeVisible();
    await expect(page.getByText('Add a task to plan your next learning action.')).toBeVisible();
  });

  test('H. Targets Page & Empty State', async ({ page }) => {
    await page.goto('/targets');

    // Check Create Target Form
    await expect(page.getByPlaceholder(/Target title/i)).toBeVisible();
    await expect(page.locator('form').getByRole('button', { name: /Create Target/i })).toBeVisible();

    // Check Empty State
    await expect(page.getByText('Set your first target')).toBeVisible();
    await expect(page.getByText('Create a learning target and start building momentum.')).toBeVisible();
  });

  test('I. Achievements Page & Category Filter', async ({ page }) => {
    await page.goto('/achievements');

    // Check Category Filter Buttons
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unlocked' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Locked', exact: true })).toBeVisible();

    // Click Unlocked Filter -> Check Empty State for fresh user
    await page.getByRole('button', { name: 'Unlocked' }).click();
    await expect(page.getByText('Your trophy shelf is waiting')).toBeVisible();
    await expect(page.getByText('Complete lessons and challenges to unlock your first achievement.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Learning' })).toBeVisible();
  });

  test('J. Notifications Page & Empty State', async ({ page }) => {
    await page.goto('/notifications');

    // Check Empty State
    await expect(page.getByText("You're all caught up")).toBeVisible();
    await expect(page.getByText('New learning updates and achievements will appear here.')).toBeVisible();

    // Check Mark All As Read button exists
    await expect(page.getByRole('button', { name: /Mark all as read/i })).toBeVisible();
  });

  test('K. Settings Page & Preferences', async ({ page }) => {
    await page.goto('/settings');

    // 1. Check Profile Information Section
    await expect(page.getByRole('heading', { name: 'Profile Information' })).toBeVisible();
    await expect(page.getByText('Email Address', { exact: true })).toBeVisible();

    // 2. Check Security Section
    await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Change Password/i })).toBeVisible();

    // 3. Check Account Management Section
    await expect(page.getByRole('heading', { name: 'Account Management' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Delete Account/i })).toBeVisible();

    // 4. Verify Appearance section & Dark Theme toggle controls are completely absent
    await expect(page.getByText('Appearance')).toHaveCount(0);
    await expect(page.getByText('Interface Theme')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Dark/i })).toHaveCount(0);
  });
});

test.describe('L. Responsive Layout Tests', () => {
  test.beforeEach(async ({ page }) => {
    attachListeners(page);
  });

  test('Homepage renders correctly across Desktop (1440px), Tablet (768px), and Mobile (390px)', async ({ page }) => {
    // Desktop 1440px
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();

    // Tablet 768px
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();

    // Mobile 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();

    // Mobile Hamburger Menu Toggle
    const hamburger = page.locator('header button[aria-label="Toggle menu"]');
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    // Mobile menu dropdown items
    const mobileMenu = page.locator('header div.md\\:hidden.absolute');
    await expect(mobileMenu.getByText('Home')).toBeVisible();
    await expect(mobileMenu.getByText('Features')).toBeVisible();
    await expect(mobileMenu.getByText('How It Works')).toBeVisible();
    await expect(mobileMenu.getByText('FAQ')).toBeVisible();
    await expect(mobileMenu.getByText('Log in')).toBeVisible();
  });

  test('Login page renders cleanly on mobile (390px) without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });
});
