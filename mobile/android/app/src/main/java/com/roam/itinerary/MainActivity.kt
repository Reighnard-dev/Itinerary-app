package com.roam.itinerary

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val appOrigin: String by lazy { Uri.parse(BuildConfig.ROAM_APP_URL).host.orEmpty() }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            settings.mediaPlaybackRequiresUserGesture = false

            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    val uri = request?.url ?: return false
                    val host = uri.host.orEmpty()
                    if (host == appOrigin || host.endsWith(".vercel.app")) {
                        return false
                    }
                    runCatching {
                        startActivity(Intent(Intent.ACTION_VIEW, uri))
                    }
                    return true
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    if (request?.isForMainFrame == true) {
                        val fallbackHtml = """
                            <!doctype html>
                            <html>
                            <body style="font-family:sans-serif;background:#faf5ea;color:#262923;padding:36px 24px;text-align:center;">
                              <div style="max-width:400px;margin:60px auto;background:#fff;padding:28px;border-radius:16px;border:1px solid #e7e7da;">
                                <h2 style="margin-top:0;">Roam needs a connection</h2>
                                <p style="color:#6d7065;font-size:14px;line-height:1.6;">Check your internet connection and tap retry to load your destinations and itineraries.</p>
                                <button onclick="location.href='${BuildConfig.ROAM_APP_URL}'" style="background:#f5cf43;color:#262923;border:0;padding:12px 20px;border-radius:8px;font-weight:700;font-size:14px;">Retry</button>
                              </div>
                            </body>
                            </html>
                        """.trimIndent()
                        view?.loadDataWithBaseURL(null, fallbackHtml, "text/html", "UTF-8", null)
                    }
                }
            }
        }

        setContentView(webView)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(BuildConfig.ROAM_APP_URL)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }
}
