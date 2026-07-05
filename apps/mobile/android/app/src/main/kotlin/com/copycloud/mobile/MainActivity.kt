package com.copycloud.mobile

import android.content.ClipboardManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.copycloud/clipboard"
    private var clipboardManager: ClipboardManager? = null
    private var lastClipboardContent: String? = null
    private var isMonitoring = false
    private val handler = Handler(Looper.getMainLooper())
    private var methodChannel: MethodChannel? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        
        methodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
        methodChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "getClipboardContent" -> {
                    result.success(getClipboardContent())
                }
                "setClipboardContent" -> {
                    val content = call.argument<String>("content")
                    if (content != null) {
                        setClipboardContent(content)
                        result.success(true)
                    } else {
                        result.error("INVALID_ARGUMENT", "Content is required", null)
                    }
                }
                "startMonitoring" -> {
                    startClipboardMonitoring()
                    result.success(true)
                }
                "stopMonitoring" -> {
                    stopClipboardMonitoring()
                    result.success(true)
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    private fun getClipboardContent(): String? {
        val clip = clipboardManager?.primaryClip
        if (clip != null && clip.itemCount > 0) {
            val item = clip.getItemAt(0)
            return item.text?.toString()
        }
        return null
    }

    private fun setClipboardContent(content: String) {
        val clip = android.content.ClipData.newPlainText("CopyCloud", content)
        clipboardManager?.setPrimaryClip(clip)
        lastClipboardContent = content
    }

    private fun startClipboardMonitoring() {
        if (isMonitoring) return
        isMonitoring = true
        
        clipboardManager?.addPrimaryClipChangedListener {
            val content = getClipboardContent()
            if (content != null && content != lastClipboardContent) {
                lastClipboardContent = content
                handler.post {
                    methodChannel?.invokeMethod("onClipboardChanged", content)
                }
            }
        }
    }

    private fun stopClipboardMonitoring() {
        isMonitoring = false
        // Note: ClipboardManager doesn't have a remove listener method in older APIs
    }

    override fun onDestroy() {
        super.onDestroy()
        stopClipboardMonitoring()
    }
}
