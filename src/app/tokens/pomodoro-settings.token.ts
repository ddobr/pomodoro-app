import { InjectionToken } from "@angular/core";
import { PomodoroSettings } from "../types/pomodoro-settings.type";
import { BehaviorSubject } from "rxjs";

export const POMODORO_SETTINGS = new InjectionToken<BehaviorSubject<PomodoroSettings>>("Настройки тайминга интервалов помодоро");
