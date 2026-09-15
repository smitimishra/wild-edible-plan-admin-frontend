import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoggedInDevices } from './logged-in-devices';

describe('LoggedInDevices', () => {
  let component: LoggedInDevices;
  let fixture: ComponentFixture<LoggedInDevices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoggedInDevices],
    }).compileComponents();

    fixture = TestBed.createComponent(LoggedInDevices);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
