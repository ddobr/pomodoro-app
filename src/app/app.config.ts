import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { NotificationService } from './services/notification.service';
import { POMODORO_SETTINGS } from './tokens/pomodoro-settings.token';
import { BehaviorSubject } from 'rxjs';
import { PomodoroSettings } from './types/pomodoro-settings.type';
import { PomodoroTimerService } from './services/pomodoro-timer.service';



export const appConfig: ApplicationConfig = {
  providers: [
    NotificationService,
    PomodoroTimerService,
    {
      provide: POMODORO_SETTINGS,
      useValue: new BehaviorSubject<PomodoroSettings>({
        taskTimeMinutes: 25,
        breakTimeMinutes: 5,
      }),
    },
    provideRouter(routes)
  ]
};
