import { Component, OnInit } from '@angular/core';
import { SideBarComponent } from "../side-bar/side-bar.component";
import { HeaderComponent } from "../header/header.component";
import { RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
  imports: [SideBarComponent, HeaderComponent, RouterOutlet],
})
export class MainComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
