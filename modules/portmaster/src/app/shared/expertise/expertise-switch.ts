import { Component, OnInit } from '@angular/core';
import { ExpertiseService } from './expertise.service';
import { ExpertiseLevel } from 'src/app/services';

@Component({
  selector: 'app-expertise',
  templateUrl: './expertise-switch.html',
  styleUrls: ['./expertise-switch.scss']
})
export class ExpertiseComponent implements OnInit {
  readonly expertiseLevels = ExpertiseLevel;

  currentLevel = this.expertiseService.change;

  constructor(private expertiseService: ExpertiseService) { }

  ngOnInit(): void {
  }

  selectLevel(lvl: ExpertiseLevel) {
    this.expertiseService.setLevel(lvl);
  }
}
