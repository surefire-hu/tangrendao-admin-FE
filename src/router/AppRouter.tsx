import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AdminLayout } from '../components/layout/AdminLayout'
import { useAuthStore } from '../store/authStore'
import { LoginPage } from '../pages/Login'
import { DashboardPage } from '../pages/Dashboard'
import { UserListPage } from '../pages/Users/UserList'
import { UserDetailPage } from '../pages/Users/UserDetail'
import { AdListPage } from '../pages/Advertisements/AdList'
import { AdFormPage } from '../pages/Advertisements/AdForm'
import { AdCardListPage } from '../pages/AdCards/AdCardList'
import { AdCardFormPage } from '../pages/AdCards/AdCardForm'
import { PublicationListPage } from '../pages/Publications/PublicationList'
import { PublicationDetailPage } from '../pages/Publications/PublicationDetail'
import { ForumListPage } from '../pages/Forum/ForumList'
import { ForumDetailPage } from '../pages/Forum/ForumDetail'
import { HotKeywordsPage } from '../pages/Forum/HotKeywordsPage'
import { AdminLogPage } from '../pages/AdminLog/AdminLogPage'
import { BroadcastPage } from '../pages/Broadcast/BroadcastPage'
import { CurrencyPage } from '../pages/Currency/CurrencyPage'
import { FeedbackPage } from '../pages/Feedback/FeedbackPage'
import { PromotionsPage } from '../pages/Promotions/PromotionsPage'
import { SupportInboxPage } from '../pages/Support/SupportInboxPage'
import { CountryListPage } from '../pages/Geography/CountryListPage'
import { SpecialistsPage } from '../pages/Specialists/SpecialistsPage'
import { NavigationPage } from '../pages/Navigation/NavigationPage'
import { ClassifiedsTaxonomyPage } from '../pages/ClassifiedsTaxonomy/ClassifiedsTaxonomyPage'
import { ClaimListPage } from '../pages/Claims/ClaimList'
import { UnbanRequestListPage } from '../pages/UnbanRequests/UnbanRequestList'
import { NewsListPage } from '../pages/News/NewsList'
import { NewsEditPage } from '../pages/News/NewsEdit'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  const canAccess = user.role === 'admin' || user.is_staff || user.is_superuser
  if (!canAccess) return <Navigate to="/login" replace />
  return <>{children}</>
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_superuser) return <Navigate to="/" replace />
  return <>{children}</>
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UserListPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="advertisements" element={<AdListPage />} />
          <Route path="advertisements/create" element={<AdFormPage />} />
          <Route path="advertisements/:id/edit" element={<AdFormPage />} />
          <Route path="adcards" element={<AdCardListPage />} />
          <Route path="adcards/create" element={<AdCardFormPage />} />
          <Route path="adcards/:id/edit" element={<AdCardFormPage />} />
          <Route path="publications/market" element={<PublicationListPage type="market" />} />
          <Route path="publications/local-services" element={<PublicationListPage type="local_service" />} />
          <Route path="publications/jobs" element={<PublicationListPage type="job_post" />} />
          <Route path="publications/housing" element={<PublicationListPage type="housing" />} />
          <Route path="publications/listings" element={<PublicationListPage type="listing" />} />
          <Route path="publications/:type/:id" element={<PublicationDetailPage />} />
          <Route path="forum/posts" element={<ForumListPage kind="post" />} />
          <Route path="forum/videos" element={<ForumListPage kind="video" />} />
          <Route path="forum/hot-keywords" element={<HotKeywordsPage />} />
          <Route path="forum/posts/:id" element={<ForumDetailPage />} />
          <Route path="broadcast" element={<BroadcastPage />} />
          <Route path="currency" element={<CurrencyPage />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="support" element={<SupportInboxPage />} />
          <Route path="geography" element={<CountryListPage />} />
          <Route path="specialists" element={<SpecialistsPage />} />
          <Route path="navigation" element={<NavigationPage />} />
          <Route path="classifieds-taxonomy" element={<ClassifiedsTaxonomyPage />} />
          <Route path="claims" element={<ClaimListPage />} />
          <Route path="unban-requests" element={<UnbanRequestListPage />} />
          <Route path="news" element={<NewsListPage />} />
          <Route path="news/create" element={<NewsEditPage />} />
          <Route path="news/:id/edit" element={<NewsEditPage />} />
          <Route
            path="admin-log"
            element={
              <SuperAdminRoute>
                <AdminLogPage />
              </SuperAdminRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
