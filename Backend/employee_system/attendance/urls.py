from django.urls import path
from .views import login_view, logout_view, attendance_list, today_status, download_excel

urlpatterns = [
    path('login/', login_view),
    path('logout/', logout_view),
    path('attendance/', attendance_list),
    path('today/', today_status),
    path('download/', download_excel),
]