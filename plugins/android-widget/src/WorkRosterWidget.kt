package com.workroster.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class WorkRosterWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {

        internal fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences("HomeWidgetPlugin", Context.MODE_PRIVATE)

            val shiftType = prefs.getString("shift_type", "rest") ?: "rest"
            val shiftLabel = prefs.getString("shift_label", "راحة") ?: "راحة"
            val shiftTime = prefs.getString("shift_time", "") ?: ""
            val dateLabel = prefs.getString("date_label", getTodayDate()) ?: getTodayDate()

            val bgColor = when (shiftType) {
                "morning" -> Color.parseColor("#E67E22")
                "evening" -> Color.parseColor("#E74C8B")
                "night"   -> Color.parseColor("#3F51B5")
                "rest"    -> Color.parseColor("#43A047")
                else      -> Color.parseColor("#E67E22")
            }

            val views = RemoteViews(context.packageName, R.layout.widget_work_roster)

            views.setTextViewText(R.id.widget_shift_label, shiftLabel)
            views.setTextViewText(R.id.widget_date, dateLabel)
            views.setTextViewText(
                R.id.widget_shift_time,
                if (shiftTime.isNotEmpty()) shiftTime else ""
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val bgDrawable = android.graphics.drawable.GradientDrawable()
                bgDrawable.setColor(bgColor)
                bgDrawable.cornerRadius = 40f
                views.setInt(R.id.widget_container, "setBackgroundColor", bgColor)
            } else {
                views.setInt(R.id.widget_container, "setBackgroundColor", bgColor)
            }

            val intent = Intent(context, Class.forName("${context.packageName}.MainActivity"))
            val pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun getTodayDate(): String {
            val sdf = SimpleDateFormat("dd/MM", Locale.getDefault())
            return sdf.format(Date())
        }
    }
}
