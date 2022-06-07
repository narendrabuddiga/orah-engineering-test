import { NextFunction, Request, Response } from "express"
import { getRepository } from "typeorm"
import {GroupStudent} from "./../entity/group-student.entity";
import { Group } from "../entity/group.entity";
import {Student} from "./../entity/student.entity";
import { Roll } from "../entity/roll.entity";
import {StudentRollState} from "./../entity/student-roll-state.entity"
import { CreateGroupInput,UpdateGroupInput } from "../interface/group.interface"
import { CreateGroupStudentInput } from "../interface/group-student.interface"
import * as moment from "moment"

export class GroupController {

  private rollRepo = getRepository(Roll);
  private groupRepo= getRepository(Group);
  private groupStudentRepo=getRepository(GroupStudent);
  private studentRollStatesRepo=getRepository(StudentRollState);

  async allGroups(request: Request, response: Response, next: NextFunction) {
    // Task 1: 
    return await this.groupRepo.find();
    // Return the list of all groups
  }

  async createGroup(request: Request, response: Response, next: NextFunction) {
    // Task 1: 
    try{
    const { body: params } = request

    if (!params.name ||!params.number_of_weeks ||!params.roll_states|| !params.incidents||!params.ltmt||
      !this.validRollStates(params.roll_states) || !this.validLtmt(params.ltmt)) {
      response.status(400).send("Data is not valid")
      return
    }

    const createGroupInput:CreateGroupInput = {
      name :params.name,
      number_of_weeks:params.number_of_weeks,
      roll_states :params.roll_states,
      incidents :params.incidents,
      ltmt:params.ltmt,
      run_at: new Date(),
      student_count: 0,  
    }
    const groupObj = new Group()
    groupObj.prepareToCreate(createGroupInput)

    return await this.groupRepo.save(groupObj)
  }catch(err){
    response.status(500).send(err)
  }
    // Add a Group
  }

  async updateGroup(request: Request, response: Response, next: NextFunction) {
    // Task 1: 
    
    // Update a Group
    try{
    const { body: params } = request
    if (!params.id) {
      response.status(400).send("Invalid Group id")
      return
    }
    if (!this.validRollStates(params.roll_states)) {
      response.status(400).send("Invalid roll states Data")
      return
    }
    if (!this.validLtmt(params.ltmt)) {
      response.status(400).send("Invalid ltmt Data")
      return
    }
    this.groupRepo.findOne(params.id).then((group) => {
      const updateGroupInput: UpdateGroupInput = {
      id: params.id,
      name: params.name || group.name,
      number_of_weeks: params.number_of_weeks || group.number_of_weeks,
      roll_states: params.roll_states || group.roll_states,
      incidents: params.incidents || group.incidents,
      ltmt: params.ltmt || group.ltmt,
      run_at: params.run_at || group.run_at,
      student_count: group.student_count,
      }

      group.prepareToUpdate(updateGroupInput)
      return this.groupRepo.save(group)
    })
    response.status(200).send("Updated!")
    return
  }catch(err){
    response.status(500).send(err);
  }
  }

  async removeGroup(request: Request, response: Response, next: NextFunction) {
    // Task 1: 
    // Delete a Group
    const { body: params } = request
    if (!params.id) {
      response.status(400).send("Invalid Group id")
      return
    }
    let groupToRemove = await this.groupRepo.findOne(params.id)
    await this.groupRepo
      .remove(groupToRemove)
      .then(() => response.status(200).send("Deleted  the Group"))
      .catch((err) => response.status(500).send(err))
  }

  async getGroupStudents(request: Request, response: Response, next: NextFunction) {
    // Task 1:  
    // Return the list of Students that are in a Group
    try{
    if (!request.query.id) {
      response.status(400).send("Invalid Group id")
      return
    }
    return await  this.groupStudentRepo.createQueryBuilder('group_student')
    .innerJoinAndSelect(Student, "student", "student.id = group_student.student_id")
    .select("student.id AS id, student.first_name AS first_name, student.last_name AS last_name, student.first_name || ' ' || student.last_name AS full_name")
    .where("group_student.group_id = :group_id", { group_id: request.query.id})
    .getRawMany()

  }catch (err) {
    response.status(500).send(err);
    return
  }

//   SELECT s.id AS id, first_name, last_name,
//   (first_name || ' ' || last_name) AS full_name
//    FROM student AS s
//    JOIN group_student AS gs
//    ON s.id = gs.student_id
  }


  async runGroupFilters(request: Request, response: Response, next: NextFunction) {
    // Task 2:
  try{
    // 1. Clear out the groups (delete all the students from the groups)
    await this.groupStudentRepo.clear();
    // 2. For each group, query the student rolls to see which students match the filter for the group
    const groupList = await this.groupRepo.find();
     
      let runDate = new Date()
      for (const group of groupList){

        const rollStatesArray = group.roll_states.split(",").map((state) => state)
        let startingWeekDate = new Date(runDate.getFullYear(), runDate.getMonth(), runDate.getDate() - 7 * group.number_of_weeks).toISOString();
       
       let studentRollData = await  this.rollRepo.createQueryBuilder('roll')
          .innerJoinAndSelect(StudentRollState, "student", "student.roll_id = roll.id")
          .select("student.student_id AS student_id, count(student.state) AS incidents")
          .where("roll.completed_at >= :startingWeekDate", { startingWeekDate: startingWeekDate })
          .andWhere("student.state IN (:...roll_states)",{roll_states: rollStatesArray})
          .groupBy("student.student_id")
          .having(`count(student.state) ${group.ltmt} :incidents`,{incidents: group.incidents})
          .getRawMany();

          await this.addGroupByStudent(group,studentRollData)
          await this.updateGroupData(group,studentRollData,runDate)
      }
       response.status(200).send("Successfully")    
      }
    catch(error){
      response.status(500).send(error);
      return
    }
    // 3. Add the list of students that match the filter to the group
  }

  async addGroupByStudent(group:Group,studentRollData:any){
    for(let studentRoll of studentRollData){
      const CreateGroupStudentInput: CreateGroupStudentInput = {
        group_id: group.id,
        student_id: studentRoll.student_id,
        incident_count: studentRoll.incidents
      }
      const groupStudent = new GroupStudent()
      groupStudent.prepareToCreate(CreateGroupStudentInput)
      this.groupStudentRepo.save(groupStudent) 
    };
  }

  async updateGroupData(group: Group,studentRollData:any,runDate:Date) {
    const updateGroupInput: UpdateGroupInput = {
      id: group.id,
      name: group.name,
      number_of_weeks: group.number_of_weeks,
      roll_states: group.roll_states,
      incidents: group.incidents,
      ltmt: group.ltmt,
      run_at: runDate,
      student_count: studentRollData.length
    }
    group.prepareToUpdate(updateGroupInput)
    await this.groupRepo.save(group)
  }

  //check conditions
  validRollStates(states) {
    const roleStates = ["unmark", "present", "absent", "late"]

    return states.split(",").every((state) => roleStates.includes(state))
  }

  validLtmt(ltmt) {
    return ltmt === "<" || ltmt === ">"
  }
}
