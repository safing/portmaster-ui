import { Component, OnInit } from '@angular/core';
import { ExpertiseService } from './expertise.service';
import { ExpertiseLevel } from 'src/app/services';

@Component({
  selector: 'app-expertise',
  templateUrl: './expertise-switch.html',
  styleUrls: ['./expertise-switch.scss']
})
export class ExpertiseComponent implements OnInit {
  isOpen: boolean = false;
  readonly expertiseLevels = ExpertiseLevel;
  currentLevel = this.expertiseService.change;

  constructor(private expertiseService: ExpertiseService) { }

  ngOnInit(): void {
  }

  selectLevel(lvl: ExpertiseLevel) {
    this.isOpen = false;
    this.expertiseService.setLevel(lvl);
  }

  getString(lvl: ExpertiseLevel | null) {
    switch (lvl) {
      case ExpertiseLevel.User:
        return 'Easy';
      case ExpertiseLevel.Expert:
        return 'Expert';
      case ExpertiseLevel.Developer:
        return 'Dev'
    }
    return '';
  }
}
