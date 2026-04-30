from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Attendance

class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('user', 'login_time', 'logout_time')
    list_filter = ('login_time',)
    search_fields = ('user__username',)

admin.site.register(Attendance, AttendanceAdmin)