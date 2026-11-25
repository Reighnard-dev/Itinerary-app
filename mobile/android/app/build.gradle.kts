plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val roamAppUrl = (project.findProperty("ROAM_APP_URL") as String?)
    ?: System.getenv("ROAM_APP_URL")
    ?: "https://roam-itinerary.vercel.app"

android {
    namespace = "com.roam.itinerary"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.roam.itinerary"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "ROAM_APP_URL", "\"$roamAppUrl\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
}
