import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { PomodoroTimerService } from '../services/pomodoro-timer.service';
import { BehaviorSubject, Observable, debounceTime, filter, map, merge, of, switchMap, takeUntil, tap } from 'rxjs';
import { TimerStatus } from '../types/timer-status.type';
import { POMODORO_SETTINGS } from '../tokens/pomodoro-settings.token';
import { PomodoroSettings } from '../types/pomodoro-settings.type';
import { TimingInfo } from '../types/timing-info.type';
import { NotificationService } from '../services/notification.service';

type TimerState = TimingInfo & {
  overflow: boolean,
  status: TimerStatus,
  beautifiedTime: string,
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly timerSettings$: BehaviorSubject<PomodoroSettings> = inject(POMODORO_SETTINGS);
  protected readonly notifications: NotificationService = inject(NotificationService);
  protected readonly timer: PomodoroTimerService = inject(PomodoroTimerService);

  protected readonly state$: Observable<TimerState> = this.createTimerState();


  constructor() {
    merge(
      this.timer.newStage$,
      this.timer.status$
        .pipe(
          filter(status => status === 'running')
        )
    )
      .pipe(
        debounceTime(100),
        switchMap(() => {
          const currentStage = this.timer.timingInfo.stage;
          const ttlSec = Math.max(0, this.timer.timingInfo.deltaSeconds);

          return this.notifications.schedule(
            'Pomodoro',
            currentStage === 'break' ? 'Time to do your task' : 'Time to have a break',
            new Date(Date.now() + ttlSec * 1000)
          );
        }),
      )
      .subscribe();

    this.timer.status$
      .pipe(
        filter((e) => e === 'paused'),
        switchMap(() => this.notifications.getPendingIds()),
        switchMap((ids) => this.notifications.cancel(ids))
      )
      .subscribe();
  }


  public start(): void {
    this.timer.start();
  }

  public stop(): void {
    this.timer.stop();
  }

  public pause(): void {
    this.timer.pause();
  }

  public continue(): void {
    this.timer.continue();
  }

  public nextStage(): void {
    this.timer.nextStage();
  }

  public beatifyDelta(deltaSeconds: number): string {
    const d = Math.abs(deltaSeconds);

    const minutes = Math.floor(d / 60)
    const seconds = Math.floor(d % 60);

    const strMinutes = minutes < 10 ? `0${minutes}` : minutes.toString();
    const strSeconds = seconds < 10 ? `0${seconds}` : seconds.toString();

    return `${strMinutes}:${strSeconds}`;
  }

  private createTimerState(): Observable<TimerState> {
    return merge(
      this.timer.timingInfo$,
      this.timer.status$
    )
      .pipe(
        map((e) => {
          const info: TimingInfo = this.timer.timingInfo;

          return {
            ...info,
            overflow: info.deltaSeconds < 0,
            status: this.timer.status,
            beautifiedTime: this.beatifyDelta(info.deltaSeconds)
          }
        })
      )
  }

}
