#!/bin/bash
export JAVA_HOME=$HOME/.java/jdk-17
export PATH=$JAVA_HOME/bin:$PATH
export ANDROID_HOME=$HOME/Android/Sdk

cd packages/mobile
java -classpath gradle/wrapper/gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain assembleRelease
