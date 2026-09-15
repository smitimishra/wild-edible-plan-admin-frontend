import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MapComponent }       from '../map/map';
import { TerrainComponent }   from '../terrain/terrain';
import { PlantComponent }     from '../plant/plant';
import { UserMenuComponent }  from '../user-menu/user-menu';
import { UserSessionService } from '../services/user-session.service';

@Component({
  selector: 'app-portal',
  standalone: true,
  imports: [MapComponent, TerrainComponent, PlantComponent, UserMenuComponent, RouterLink],
  template: `
    <app-map></app-map>
    <app-terrain></app-terrain>
    <app-plant></app-plant>

    <!-- User menu — top right (Change Password + Logout) -->
    <app-user-menu></app-user-menu>
  `,
  styles: [`:host { display: block; width: 100%; height: 100vh; }`],
})
export class PortalComponent implements OnInit {

  constructor(private session: UserSessionService, private router: Router) {}

  ngOnInit(): void {
    if (!this.session.get()) {
      this.router.navigate(['/welcome']);
    }
  }
}
